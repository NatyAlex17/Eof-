-- =============================================================================
-- MANA — Schema v3 (part 1 of 2): NEW TABLES ONLY
--
-- Implements the finance-analysis DDL (docs/analysis/01-schema-audit.md §3)
-- covering facts F2, F5–F6, F8–F9, F12–F15, F17–F23.
--
-- DELIBERATELY EXCLUDED (lives in supabase/drafts/schema_v4_boxes_lots.sql,
-- to be timestamped + applied only after coordinating with Dev A, who is
-- actively wiring boxes/lots/box_contents):
--   * all `boxes` column additions (trucker, pickup_at, freight_mode, entity, …)
--   * `box_contents.pieces`, `box_pieces`
--   * `lots.shipment_id` / `lots.origin`
--   * the availability_by_species view replacement (C6) — depends on the above
--
-- ALSO EXCLUDED: the C2 order_lines fix — already applied by
-- 20260710100002_order_lines_grade.sql.
--
-- This file only: creates new enums/tables/views, and alters tables owned by
-- Dev B (purchase_orders, invoices, vendor_mappings). Safe to apply now.
--
-- After applying: regenerate apps/web/src/lib/database.types.ts and commit it
-- in the same PR (ADR-001).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
create type operating_entity as enum ('MANA','EOF');                       -- F5, F19
create type shipment_routing as enum ('warehouse','direct');               -- F12, F13
create type freight_mode     as enum ('trucker','air','customer_pickup');  -- F7 (used by v4 boxes columns)
create type document_kind    as enum ('commercial_invoice','packing_list',
                                      'vendor_statement','po_import','other'); -- F8, F10, F20
create type vendor_invoice_status as enum ('draft','parsed','needs_review',
                                           'approved','billed','void');    -- F8, F18
create type ap_bill_status   as enum ('draft','pending_sync','synced',
                                      'partially_paid','paid','void');     -- F19, F21
create type po_bill_status   as enum ('not_billed','partially_billed','billed'); -- F21

-- -----------------------------------------------------------------------------
-- DOCUMENTS  (F8, F10, F12, F14, F18 — every ingested file, one row per file)
-- No auto-commit: parsed_payload holds parser output until a human reviews it;
-- manual_overrides is the field-level correction audit trail.
-- -----------------------------------------------------------------------------
create table public.documents (
  id                 uuid primary key default gen_random_uuid(),
  kind               document_kind not null default 'other',
  vendor_id          uuid references public.vendors(id) on delete set null,
  vendor_email_id    uuid references public.vendor_emails(id) on delete set null, -- Gmail ingestion path
  original_filename  text not null,
  storage_path       text not null,               -- Supabase Storage object key
  mime_type          text,
  sha256             text unique,                 -- dedupe re-sent attachments
  destination_code   text,                        -- detected token: 'LAX','SFX','SFO','ORD','HNL' (F12)
  routing_detected   shipment_routing,            -- LAX/SFX/SFO -> 'warehouse'; ORD/HNL -> 'direct'; NULL = ambiguous, never guessed
  parse_status       parse_status not null default 'pending',  -- reuse existing enum (F18)
  parsed_payload     jsonb,                       -- raw parser output before posting
  parse_error        text,
  parser_version     text,                        -- also answers F11 template-version tracking
  reviewed_by        uuid references public.profiles(id) on delete set null, -- manual override actor
  reviewed_at        timestamptz,
  manual_overrides   jsonb not null default '{}'::jsonb, -- {field: {from,to,by,at}}
  created_at         timestamptz not null default now()
);
create index idx_documents_vendor on public.documents(vendor_id, kind, parse_status);

-- -----------------------------------------------------------------------------
-- SHIPMENTS  (F2, F8-AWB, F12, F13, F14 — warehouse AND direct flows)
-- Direct shipments (routing='direct') still create lots/boxes downstream so
-- credits/downgrades/AP keep working, but skip the board and availability.
-- -----------------------------------------------------------------------------
create table public.shipments (
  id               uuid primary key default gen_random_uuid(),
  vendor_id        uuid not null references public.vendors(id) on delete restrict,
  awb              text,                          -- air waybill (F8)
  origin           text,                          -- "coming from", e.g. 'Tahiti' (F2)
  routing          shipment_routing not null default 'warehouse',
  destination_code text,                          -- LAX/SFX/SFO/ORD/HNL
  customer_id      uuid references public.customers(id) on delete set null, -- required app-side when routing='direct'
  entity           operating_entity not null default 'MANA',
  eta              timestamptz,
  arrived_at       timestamptz,
  status           text not null default 'expected'
                   check (status in ('expected','in_transit','arrived','delivered','cancelled')),
  packing_list_document_id       uuid references public.documents(id) on delete set null, -- may stay null (F14)
  commercial_invoice_document_id uuid references public.documents(id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now()
);
create index idx_shipments_vendor on public.shipments(vendor_id, status);

alter table public.documents
  add column shipment_id uuid references public.shipments(id) on delete set null;
create index idx_documents_shipment on public.documents(shipment_id);

-- NOTE: lots.shipment_id / lots.origin intentionally deferred to v4 (Dev A sync).

-- -----------------------------------------------------------------------------
-- VENDOR (COMMERCIAL) INVOICES  (F8, F9, F14, F18 — the AP-side vendor bill;
-- public.invoices remains AR/customer-side only)
-- -----------------------------------------------------------------------------
create table public.vendor_invoices (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid not null references public.vendors(id) on delete restrict,
  document_id   uuid references public.documents(id) on delete set null,
  shipment_id   uuid references public.shipments(id) on delete set null,
  invoice_no    text not null,
  invoice_date  date,
  sold_to       text,
  terms         text,
  awb           text,
  shipment_from text,                              -- F8 (mirror of shipments.origin)
  currency      text not null default 'USD',
  subtotal      numeric(12,2),
  total         numeric(12,2) not null default 0,
  entity        operating_entity not null default 'MANA',
  status        vendor_invoice_status not null default 'draft',
  manual_overrides jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (vendor_id, invoice_no)
);
create index idx_vendor_invoices_status on public.vendor_invoices(vendor_id, status);

create table public.vendor_invoice_lines (
  id                uuid primary key default gen_random_uuid(),
  vendor_invoice_id uuid not null references public.vendor_invoices(id) on delete cascade,
  line_no           int,
  description       text,                          -- F8 verbatim description
  species           text,
  grade             text,
  carton_ref_raw    text,                          -- F9 verbatim: '5004' | '5005-5009' | '5004, 5006-5008'
  carton_numbers    int[],                         -- parsed expansion (carton-range expander output)
  pieces            int,                           -- F8 quantity pieces
  weight_lb         numeric(12,2),
  unit_price_lb     numeric(10,4),
  amount            numeric(12,2),
  manual_overrides  jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index idx_vil_invoice on public.vendor_invoice_lines(vendor_invoice_id);

-- resolved carton refs -> actual boxes (FK only; does not alter boxes)
create table public.vendor_invoice_line_boxes (
  vendor_invoice_line_id uuid not null references public.vendor_invoice_lines(id) on delete cascade,
  box_id                 uuid not null references public.boxes(id) on delete cascade,
  primary key (vendor_invoice_line_id, box_id)
);

-- -----------------------------------------------------------------------------
-- ACCOUNTS PAYABLE  (F19, F21 — bills, due dates, partial payments, aging)
-- Entity-scoped: F19 says AP exists separately for MANA and EOF.
-- -----------------------------------------------------------------------------
create table public.ap_bills (
  id                uuid primary key default gen_random_uuid(),
  vendor_id         uuid not null references public.vendors(id) on delete restrict,
  entity            operating_entity not null default 'MANA',
  purchase_order_id uuid references public.purchase_orders(id) on delete set null, -- F21 PO->Bill conversion
  vendor_invoice_id uuid references public.vendor_invoices(id) on delete set null,
  bill_no           text,
  qbo_bill_id       text,
  bill_date         date,
  due_date          date,                          -- terms-driven; aging basis
  amount            numeric(12,2) not null default 0,
  amount_paid       numeric(12,2) not null default 0,
  status            ap_bill_status not null default 'draft',
  memo              text,
  created_at        timestamptz not null default now()
);
create index idx_ap_bills_vendor on public.ap_bills(vendor_id, status, due_date);

create table public.ap_payments (
  id             uuid primary key default gen_random_uuid(),
  vendor_id      uuid references public.vendors(id) on delete set null,
  qbo_payment_id text,
  paid_at        date not null default current_date,
  method         text,                             -- 'ach','wire','check',...
  reference      text,
  amount         numeric(12,2) not null,
  created_at     timestamptz not null default now()
);
create index idx_ap_payments_vendor on public.ap_payments(vendor_id);

create table public.ap_payment_applications (      -- one payment can settle N bills
  id         uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.ap_payments(id) on delete cascade,
  bill_id    uuid not null references public.ap_bills(id) on delete cascade,
  amount     numeric(12,2) not null,
  unique (payment_id, bill_id)
);
create index idx_ap_apps_bill on public.ap_payment_applications(bill_id);

create view public.ap_aging with (security_invoker = true) as
select b.vendor_id, v.name as vendor, b.entity,
  sum(b.amount - b.amount_paid) filter (where b.due_date >= current_date)                                          as current_due,
  sum(b.amount - b.amount_paid) filter (where b.due_date <  current_date and b.due_date >= current_date - 30)      as d1_30,
  sum(b.amount - b.amount_paid) filter (where b.due_date <  current_date - 30 and b.due_date >= current_date - 60) as d31_60,
  sum(b.amount - b.amount_paid) filter (where b.due_date <  current_date - 60 and b.due_date >= current_date - 90) as d61_90,
  sum(b.amount - b.amount_paid) filter (where b.due_date <  current_date - 90)                                     as d90_plus,
  sum(b.amount - b.amount_paid)                                                                                    as total_open
from public.ap_bills b join public.vendors v on v.id = b.vendor_id
where b.status not in ('paid','void')
group by b.vendor_id, v.name, b.entity;

-- -----------------------------------------------------------------------------
-- PURCHASE ORDERS v2  (F5, F20, F21, F22 — header + lines; PO presence = EOF)
-- purchase_orders is Dev B-owned; safe to alter here.
-- -----------------------------------------------------------------------------
alter table public.purchase_orders
  add column customer_id     uuid references public.customers(id) on delete set null, -- F22
  add column order_id        uuid references public.orders(id) on delete set null,    -- F22 "order number"
  add column order_date      date,                                                    -- F22
  add column entity          operating_entity not null default 'EOF',                 -- F5: PO presence = EOF
  add column qbo_po_id       text,                                                    -- F20
  add column bill_status     po_bill_status not null default 'not_billed',            -- F21
  add column document_id     uuid references public.documents(id) on delete set null, -- F20 Excel source
  add column import_batch_id uuid;   -- FK added after po_import_batches below

create table public.purchase_order_lines (
  id                uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  species           text not null,
  grade             text,
  sku_code          text references public.skus(code) on update cascade,
  box_ref_raw       text,                          -- F22 box number(s), F9-style raw
  box_numbers       int[],
  box_id            uuid references public.boxes(id) on delete set null,  -- FK only; does not alter boxes
  weight_lb         numeric(12,2),                 -- F22
  rate_per_lb       numeric(10,4),                 -- F22
  amount            numeric(12,2) generated always as
                    (round(coalesce(weight_lb,0) * coalesce(rate_per_lb,0), 2)) stored,
  created_at        timestamptz not null default now()
);
create index idx_pol_po on public.purchase_order_lines(purchase_order_id);

-- Backfill: one line per legacy single-species PO.
-- purchase_orders.species / expected_lb stay until the PO UI migrates to lines,
-- then get dropped in a later cleanup migration.
insert into public.purchase_order_lines (purchase_order_id, species, weight_lb)
select po.id, po.species, po.expected_lb
from public.purchase_orders po
where not exists (select 1 from public.purchase_order_lines pol
                  where pol.purchase_order_id = po.id);

create table public.po_import_batches (            -- F20: replaces the paid third-party bulk tool
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete set null,
  direction   text not null check (direction in ('import','export')),
  target      text not null default 'qbo' check (target in ('qbo','excel')),
  row_count   int,
  status      text not null default 'pending' check (status in ('pending','processed','failed')),
  error       text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.purchase_orders
  add constraint purchase_orders_import_batch_fkey
  foreign key (import_batch_id) references public.po_import_batches(id) on delete set null;

-- -----------------------------------------------------------------------------
-- AR INVOICE LINES + DIRECT-SHIPMENT RE-INVOICING  (F15, F23)
-- invoices is Dev B-owned (QBO side); safe to alter here.
-- -----------------------------------------------------------------------------
alter table public.invoices
  add column entity                   operating_entity not null default 'MANA',
  add column shipment_id              uuid references public.shipments(id) on delete set null,
  add column source_vendor_invoice_id uuid references public.vendor_invoices(id) on delete set null; -- middleman lineage: NEVER forward the vendor invoice

create table public.invoice_lines (
  id                            uuid primary key default gen_random_uuid(),
  invoice_id                    uuid not null references public.invoices(id) on delete cascade,
  source_vendor_invoice_line_id uuid references public.vendor_invoice_lines(id) on delete set null, -- same boxes/items, marked-up rate (F15)
  description                   text,
  species                       text,
  grade                         text,
  carton_ref_raw                text,
  pieces                        int,
  weight_lb                     numeric(12,2),
  unit_price_lb                 numeric(10,4),     -- marked-up rate
  amount                        numeric(12,2),
  qbo_billable                  boolean not null default false, -- F23 investigation hook
  created_at                    timestamptz not null default now()
);
create index idx_invlines_invoice on public.invoice_lines(invoice_id);

-- -----------------------------------------------------------------------------
-- PER-ENTITY PRODUCT CODES  (F5, F6, F17 — EOF codes + per-entity QBO items)
-- -----------------------------------------------------------------------------
create table public.sku_entity_codes (
  id                    uuid primary key default gen_random_uuid(),
  sku_code              text not null references public.skus(code) on update cascade on delete cascade,
  entity                operating_entity not null,
  code                  text not null,              -- EOF product code (F6)
  qbo_item_id           text,                       -- per-entity QBO item (F17)
  default_selling_price numeric(10,2),              -- F6 "selling price sometimes written on it"
  unique (entity, code),
  unique (sku_code, entity)
);

-- -----------------------------------------------------------------------------
-- QBO OBJECT LINKS / SYNC STATE  (F17, F20, F21 — generic local<->QBO mapping)
-- -----------------------------------------------------------------------------
create table public.qbo_object_links (
  id             uuid primary key default gen_random_uuid(),
  local_table    text not null,                    -- 'invoices','ap_bills','purchase_orders','skus',...
  local_id       uuid not null,
  qbo_type       text not null,                    -- 'Invoice','Bill','PurchaseOrder','Item','BillPayment'
  qbo_id         text not null,
  sync_status    text not null default 'pending' check (sync_status in ('pending','synced','failed')),
  last_synced_at timestamptz,
  error          text,
  unique (local_table, local_id, qbo_type)
);
create index idx_qbo_links_local on public.qbo_object_links(local_table, local_id);

-- -----------------------------------------------------------------------------
-- C5 FIX: vendor_mappings per doc type + missing packing-list fields (F8, F10)
-- vendor_mappings is Dev B-owned; safe to alter here.
-- -----------------------------------------------------------------------------
alter table public.vendor_mappings
  drop constraint if exists vendor_mappings_vendor_id_key;
alter table public.vendor_mappings
  add column doc_type     document_kind not null default 'packing_list',
  add column pieces_col   text,          -- units per box
  add column box_type_col text,
  add column ice_col      text,          -- gel-ice type
  add column net_kg_col   text,
  add constraint vendor_mappings_vendor_doc_ux unique (vendor_id, doc_type);

-- -----------------------------------------------------------------------------
-- GRANTS + RLS  (convention: staff read, role-gated write; see 0003)
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on
  public.documents, public.shipments,
  public.vendor_invoices, public.vendor_invoice_lines, public.vendor_invoice_line_boxes,
  public.ap_bills, public.ap_payments, public.ap_payment_applications,
  public.purchase_order_lines, public.po_import_batches,
  public.invoice_lines, public.sku_entity_codes
to authenticated;

-- documents / shipments: ops + finance both touch ingestion & receiving
alter table public.documents enable row level security;
create policy "documents_read"  on public.documents for select to authenticated using (true);
create policy "documents_write" on public.documents for all to authenticated
  using (public.app_role() in ('admin','operations','finance'))
  with check (public.app_role() in ('admin','operations','finance'));

alter table public.shipments enable row level security;
create policy "shipments_read"  on public.shipments for select to authenticated using (true);
create policy "shipments_write" on public.shipments for all to authenticated
  using (public.app_role() in ('admin','operations','finance'))
  with check (public.app_role() in ('admin','operations','finance'));

-- vendor invoices + AP: finance-gated
alter table public.vendor_invoices enable row level security;
create policy "vendor_invoices_read"  on public.vendor_invoices for select to authenticated using (true);
create policy "vendor_invoices_write" on public.vendor_invoices for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

alter table public.vendor_invoice_lines enable row level security;
create policy "vendor_invoice_lines_read"  on public.vendor_invoice_lines for select to authenticated using (true);
create policy "vendor_invoice_lines_write" on public.vendor_invoice_lines for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

alter table public.vendor_invoice_line_boxes enable row level security;
create policy "vendor_invoice_line_boxes_read"  on public.vendor_invoice_line_boxes for select to authenticated using (true);
create policy "vendor_invoice_line_boxes_write" on public.vendor_invoice_line_boxes for all to authenticated
  using (public.app_role() in ('admin','finance','operations'))
  with check (public.app_role() in ('admin','finance','operations'));

alter table public.ap_bills enable row level security;
create policy "ap_bills_read"  on public.ap_bills for select to authenticated using (true);
create policy "ap_bills_write" on public.ap_bills for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

alter table public.ap_payments enable row level security;
create policy "ap_payments_read"  on public.ap_payments for select to authenticated using (true);
create policy "ap_payments_write" on public.ap_payments for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

alter table public.ap_payment_applications enable row level security;
create policy "ap_payment_applications_read"  on public.ap_payment_applications for select to authenticated using (true);
create policy "ap_payment_applications_write" on public.ap_payment_applications for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

-- PO lines + import batches: finance keys POs today; ops receives against them.
alter table public.purchase_order_lines enable row level security;
create policy "purchase_order_lines_read"  on public.purchase_order_lines for select to authenticated using (true);
create policy "purchase_order_lines_write" on public.purchase_order_lines for all to authenticated
  using (public.app_role() in ('admin','operations','finance'))
  with check (public.app_role() in ('admin','operations','finance'));

-- widen the existing PO header policy to include finance (was admin/operations)
drop policy if exists "purchase_orders_write" on public.purchase_orders;
create policy "purchase_orders_write" on public.purchase_orders for all to authenticated
  using (public.app_role() in ('admin','operations','finance'))
  with check (public.app_role() in ('admin','operations','finance'));

alter table public.po_import_batches enable row level security;
create policy "po_import_batches_read"  on public.po_import_batches for select to authenticated using (true);
create policy "po_import_batches_write" on public.po_import_batches for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

-- AR invoice lines: same gate as invoices (admin/finance)
alter table public.invoice_lines enable row level security;
create policy "invoice_lines_read"  on public.invoice_lines for select to authenticated using (true);
create policy "invoice_lines_write" on public.invoice_lines for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

-- sku_entity_codes: same gate as skus (admin)
alter table public.sku_entity_codes enable row level security;
create policy "sku_entity_codes_read"  on public.sku_entity_codes for select to authenticated using (true);
create policy "sku_entity_codes_write" on public.sku_entity_codes for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- qbo_object_links: service-role only (same treatment as integration_tokens)
alter table public.qbo_object_links enable row level security;
revoke all on public.qbo_object_links from authenticated, anon;

-- -----------------------------------------------------------------------------
-- REALTIME: finance queue + document inbox stream live
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime
      add table public.documents, public.shipments, public.ap_bills;
  end if;
exception when duplicate_object then null;
end $$;
