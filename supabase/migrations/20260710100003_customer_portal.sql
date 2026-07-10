-- =============================================================================
-- MANA — Customer Portal (external "customer" role + data isolation)
--
-- Adds a self-service customer role. The hard part is security: the original
-- RLS gave EVERY authenticated user broad `using(true)` reads. A customer login
-- would inherit all of that. This migration inverts it for the customer role:
--   • customer sees ONLY their own customer row, orders, order lines, invoices,
--     credit claims, and price overrides;
--   • customer can read the catalog (skus / tiers / tier prices) to place orders;
--   • customer is denied everything internal (vendors, lots, boxes, contents,
--     pick slips, POs, other customers, board locks, audit, statements…);
--   • customer may INSERT their own orders / order lines / credit claims.
-- Internal roles keep exactly the access they had.
--
-- NOTE: a freshly-added enum value can't be used as an enum LITERAL in the same
-- transaction that added it, so every role check below compares app_role()::text.
--
-- Run AFTER 20260710100001_roles.sql. Safe to re-run.
-- =============================================================================

-- 1. New role + registry entry ------------------------------------------------
alter type public.user_role add value if not exists 'customer';

insert into public.roles (key, label, description, color, bg, sort, is_system)
values ('customer', 'Customer',
        'External buyer — portal access to their own orders only',
        '#5A3E6B', '#F0ECF6', 70, true)
on conflict (key) do nothing;

-- 2. Link a login to a customer record; tag where an order came from ----------
alter table public.profiles
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

alter table public.orders
  add column if not exists source text not null default 'staff';   -- 'staff' | 'customer'

-- 3. Current user's customer_id — SECURITY DEFINER so RLS on profiles can't
--    cause recursion when this is called from another table's policy.
create or replace function public.app_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select customer_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.app_customer_id() to authenticated;

-- 4. Re-scope reads ------------------------------------------------------------
-- Convention: `app_role()::text <> 'customer'` = "any internal user" (keeps
-- every existing staff role). Customer rows are added via an OR on ownership.

-- PROFILES: customer sees only their own profile row.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.app_role()::text <> 'customer');

-- CUSTOMERS: customer sees only their own record.
drop policy if exists "customers_read" on public.customers;
create policy "customers_read" on public.customers
  for select to authenticated
  using (public.app_role()::text <> 'customer' or id = public.app_customer_id());

-- ORDERS: customer sees only their own orders (+ may create them).
drop policy if exists "orders_read" on public.orders;
create policy "orders_read" on public.orders
  for select to authenticated
  using (public.app_role()::text <> 'customer' or customer_id = public.app_customer_id());

drop policy if exists "orders_customer_insert" on public.orders;
create policy "orders_customer_insert" on public.orders
  for insert to authenticated
  with check (public.app_role()::text = 'customer' and customer_id = public.app_customer_id());

-- ORDER_LINES: customer sees / adds lines only for their own orders.
drop policy if exists "order_lines_read" on public.order_lines;
create policy "order_lines_read" on public.order_lines
  for select to authenticated
  using (
    public.app_role()::text <> 'customer'
    or exists (select 1 from public.orders o
               where o.id = order_lines.order_id and o.customer_id = public.app_customer_id())
  );

drop policy if exists "order_lines_customer_insert" on public.order_lines;
create policy "order_lines_customer_insert" on public.order_lines
  for insert to authenticated
  with check (
    public.app_role()::text = 'customer'
    and exists (select 1 from public.orders o
                where o.id = order_lines.order_id and o.customer_id = public.app_customer_id())
  );

-- INVOICES: customer sees only their own.
drop policy if exists "invoices_read" on public.invoices;
create policy "invoices_read" on public.invoices
  for select to authenticated
  using (public.app_role()::text <> 'customer' or customer_id = public.app_customer_id());

-- PRICE_OVERRIDES: customer sees only their own negotiated prices.
drop policy if exists "price_overrides_read" on public.price_overrides;
create policy "price_overrides_read" on public.price_overrides
  for select to authenticated
  using (public.app_role()::text <> 'customer' or customer_id = public.app_customer_id());

-- CREDIT_CLAIMS: customer sees / files only their own claims.
drop policy if exists "credit_claims_read" on public.credit_claims;
create policy "credit_claims_read" on public.credit_claims
  for select to authenticated
  using (public.app_role()::text <> 'customer' or customer_id = public.app_customer_id());

drop policy if exists "credit_claims_customer_insert" on public.credit_claims;
create policy "credit_claims_customer_insert" on public.credit_claims
  for insert to authenticated
  with check (public.app_role()::text = 'customer' and customer_id = public.app_customer_id());

-- 5. Internal-only tables: deny the customer role outright (was using(true)) ---
drop policy if exists "vendors_read" on public.vendors;
create policy "vendors_read" on public.vendors for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "lots_read" on public.lots;
create policy "lots_read" on public.lots for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "boxes_read" on public.boxes;
create policy "boxes_read" on public.boxes for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "board_locks_read" on public.board_locks;
create policy "board_locks_read" on public.board_locks for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "pick_slips_read" on public.pick_slips;
create policy "pick_slips_read" on public.pick_slips for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "downgrades_read" on public.downgrades;
create policy "downgrades_read" on public.downgrades for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "vendor_statements_read" on public.vendor_statements;
create policy "vendor_statements_read" on public.vendor_statements for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "statement_lines_read" on public.statement_lines;
create policy "statement_lines_read" on public.statement_lines for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "vendor_emails_read" on public.vendor_emails;
create policy "vendor_emails_read" on public.vendor_emails for select to authenticated
  using (public.app_role()::text <> 'customer');

-- v2 tables
drop policy if exists "box_contents_read" on public.box_contents;
create policy "box_contents_read" on public.box_contents for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "purchase_orders_read" on public.purchase_orders;
create policy "purchase_orders_read" on public.purchase_orders for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "vendor_mappings_read" on public.vendor_mappings;
create policy "vendor_mappings_read" on public.vendor_mappings for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "vendor_species_codes_read" on public.vendor_species_codes;
create policy "vendor_species_codes_read" on public.vendor_species_codes for select to authenticated
  using (public.app_role()::text <> 'customer');

drop policy if exists "standing_orders_read" on public.standing_orders;
create policy "standing_orders_read" on public.standing_orders for select to authenticated
  using (public.app_role()::text <> 'customer');

-- Catalog tables (skus, pricing_tiers, tier_species_prices, roles) intentionally
-- stay readable — the portal needs them to price an order, and they expose no
-- other customer's data or any cost/margin.
