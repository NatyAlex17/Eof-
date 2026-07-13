-- =============================================================================
-- MANA — Vendor Portal (external "vendor" role + data isolation + uploads)
--
-- Mirrors the customer-portal pattern: vendor is an external role that sees
-- ONLY its own slice — its vendor record, documents it uploaded, its shipments,
-- lots, and settlement statements. Vendors must NEVER see revenue, sell prices,
-- margin, customer names, or other vendors (External Portals scope doc).
--
-- Also fixes schema-v3's `using (true)` read policies (documents, shipments,
-- vendor invoices, AP, PO lines, invoice lines, entity codes): those were
-- readable by ANY authenticated user, including customers. They become
-- staff-only (or vendor-owned where appropriate).
--
-- NOTE: a freshly-added enum value can't be used as an enum literal in the same
-- transaction, so every role check compares app_role()::text (same convention
-- as 20260710100003_customer_portal.sql).
--
-- Run AFTER 20260710120001_schema_v3_new_tables.sql. Safe to re-run.
-- =============================================================================

-- 1. New role + registry entry ------------------------------------------------
alter type public.user_role add value if not exists 'vendor';

insert into public.roles (key, label, description, color, bg, sort, is_system)
values ('vendor', 'Vendor',
        'External supplier — portal access to their own shipments and documents only',
        '#8A5A14', '#F4EEE2', 80, true)
on conflict (key) do nothing;

-- 2. Link a login to a vendor record -------------------------------------------
alter table public.profiles
  add column if not exists vendor_id uuid references public.vendors(id) on delete set null;

-- 3. Current user's vendor_id — SECURITY DEFINER to avoid RLS recursion --------
create or replace function public.app_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select vendor_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.app_vendor_id() to authenticated;

-- Convention below:
--   staff        = app_role()::text not in ('customer','vendor')
--   vendor-owned = ... or vendor_id = app_vendor_id()

-- 4. Vendor-owned reads ---------------------------------------------------------
drop policy if exists "vendors_read" on public.vendors;
create policy "vendors_read" on public.vendors
  for select to authenticated
  using (public.app_role()::text not in ('customer','vendor')
         or id = public.app_vendor_id());

drop policy if exists "documents_read" on public.documents;
create policy "documents_read" on public.documents
  for select to authenticated
  using (public.app_role()::text not in ('customer','vendor')
         or vendor_id = public.app_vendor_id());

-- Vendors may UPLOAD their own packing lists / commercial invoices. They enter
-- the same review pipeline as Gmail intake — parse_status starts 'pending';
-- only staff review/commit (documents_write stays staff-gated from v3).
drop policy if exists "documents_vendor_insert" on public.documents;
create policy "documents_vendor_insert" on public.documents
  for insert to authenticated
  with check (
    public.app_role()::text = 'vendor'
    and vendor_id = public.app_vendor_id()
    and kind in ('packing_list', 'commercial_invoice')
  );

drop policy if exists "shipments_read" on public.shipments;
create policy "shipments_read" on public.shipments
  for select to authenticated
  using (public.app_role()::text not in ('customer','vendor')
         or vendor_id = public.app_vendor_id());

drop policy if exists "lots_read" on public.lots;
create policy "lots_read" on public.lots
  for select to authenticated
  using (public.app_role()::text not in ('customer','vendor')
         or vendor_id = public.app_vendor_id());

drop policy if exists "boxes_read" on public.boxes;
create policy "boxes_read" on public.boxes
  for select to authenticated
  using (
    public.app_role()::text not in ('customer','vendor')
    or exists (select 1 from public.lots l
               where l.id = boxes.lot_id and l.vendor_id = public.app_vendor_id())
  );

drop policy if exists "box_contents_read" on public.box_contents;
create policy "box_contents_read" on public.box_contents
  for select to authenticated
  using (
    public.app_role()::text not in ('customer','vendor')
    or exists (select 1 from public.boxes b
               join public.lots l on l.id = b.lot_id
               where b.id = box_contents.box_id and l.vendor_id = public.app_vendor_id())
  );

drop policy if exists "vendor_statements_read" on public.vendor_statements;
create policy "vendor_statements_read" on public.vendor_statements
  for select to authenticated
  using (public.app_role()::text not in ('customer','vendor')
         or vendor_id = public.app_vendor_id());

drop policy if exists "statement_lines_read" on public.statement_lines;
create policy "statement_lines_read" on public.statement_lines
  for select to authenticated
  using (
    public.app_role()::text not in ('customer','vendor')
    or exists (select 1 from public.vendor_statements vs
               where vs.id = statement_lines.statement_id
                 and vs.vendor_id = public.app_vendor_id())
  );

-- 5. Customer-scoped tables must ALSO exclude vendor ----------------------------
-- (their current policies pass any non-customer role — vendor slipped through)
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.app_role()::text not in ('customer','vendor'));

drop policy if exists "customers_read" on public.customers;
create policy "customers_read" on public.customers
  for select to authenticated
  using (public.app_role()::text not in ('customer','vendor')
         or id = public.app_customer_id());

drop policy if exists "orders_read" on public.orders;
create policy "orders_read" on public.orders
  for select to authenticated
  using (public.app_role()::text not in ('customer','vendor')
         or customer_id = public.app_customer_id());

drop policy if exists "order_lines_read" on public.order_lines;
create policy "order_lines_read" on public.order_lines
  for select to authenticated
  using (
    public.app_role()::text not in ('customer','vendor')
    or exists (select 1 from public.orders o
               where o.id = order_lines.order_id
                 and o.customer_id = public.app_customer_id())
  );

drop policy if exists "invoices_read" on public.invoices;
create policy "invoices_read" on public.invoices
  for select to authenticated
  using (public.app_role()::text not in ('customer','vendor')
         or customer_id = public.app_customer_id());

drop policy if exists "price_overrides_read" on public.price_overrides;
create policy "price_overrides_read" on public.price_overrides
  for select to authenticated
  using (public.app_role()::text not in ('customer','vendor')
         or customer_id = public.app_customer_id());

drop policy if exists "credit_claims_read" on public.credit_claims;
create policy "credit_claims_read" on public.credit_claims
  for select to authenticated
  using (public.app_role()::text not in ('customer','vendor')
         or customer_id = public.app_customer_id());

-- 6. Internal-only tables: exclude BOTH external roles --------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'board_locks', 'pick_slips', 'downgrades', 'vendor_emails',
    'purchase_orders', 'vendor_mappings', 'vendor_species_codes',
    'standing_orders'
  ] loop
    execute format('drop policy if exists "%s_read" on public.%I', t, t);
    execute format(
      'create policy "%s_read" on public.%I for select to authenticated
         using (public.app_role()::text not in (''customer'',''vendor''))', t, t);
  end loop;
end $$;

-- v3 tables that were using(true): staff-only reads. (Vendors see their money
-- through vendor_statements, not raw vendor_invoices/AP.)
do $$
declare
  t text;
begin
  foreach t in array array[
    'vendor_invoices', 'vendor_invoice_lines', 'vendor_invoice_line_boxes',
    'ap_bills', 'ap_payments', 'ap_payment_applications',
    'purchase_order_lines', 'po_import_batches', 'invoice_lines',
    'sku_entity_codes'
  ] loop
    execute format('drop policy if exists "%s_read" on public.%I', t, t);
    execute format(
      'create policy "%s_read" on public.%I for select to authenticated
         using (public.app_role()::text not in (''customer'',''vendor''))', t, t);
  end loop;
end $$;

-- 7. Catalog: customers need pricing; vendors must NOT see sell prices ----------
drop policy if exists "skus_read" on public.skus;
create policy "skus_read" on public.skus
  for select to authenticated using (public.app_role()::text <> 'vendor');

drop policy if exists "pricing_tiers_read" on public.pricing_tiers;
create policy "pricing_tiers_read" on public.pricing_tiers
  for select to authenticated using (public.app_role()::text <> 'vendor');

drop policy if exists "tsp_read" on public.tier_species_prices;
create policy "tsp_read" on public.tier_species_prices
  for select to authenticated using (public.app_role()::text <> 'vendor');

-- 8. Storage: private bucket for vendor uploads ---------------------------------
insert into storage.buckets (id, name, public)
values ('vendor-docs', 'vendor-docs', false)
on conflict (id) do nothing;

-- Vendors upload only into their own folder: vendor-docs/{vendor_id}/...
drop policy if exists "vendor_docs_insert" on storage.objects;
create policy "vendor_docs_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vendor-docs'
    and (storage.foldername(name))[1] = public.app_vendor_id()::text
  );

-- Vendors read their own files; staff read all vendor docs.
drop policy if exists "vendor_docs_read" on storage.objects;
create policy "vendor_docs_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vendor-docs'
    and (
      (storage.foldername(name))[1] = public.app_vendor_id()::text
      or public.app_role()::text not in ('customer','vendor')
    )
  );
