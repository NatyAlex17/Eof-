# Schema v2 Audit vs Meeting Facts F1–F23 + Migration v3 Proposal

Files audited:

- `D:\Documents\Projects\Eromo Ventures\EOF-NEW\Eof-\supabase\migrations\20260630090001_schema.sql` (v1)
- `D:\Documents\Projects\Eromo Ventures\EOF-NEW\Eof-\supabase\migrations\20260702100001_schema_v2_fixes.sql` (v2)

## Part 1 — Fact-by-fact coverage

| ID  | Verdict                                  | Detail                                                                                                                                                                                                                                                                                                                                                    |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **COVERED** (with one adjacent conflict) | `boxes.label` + `box_contents(species, grade, weight)` — multiple rows per box, no uniqueness on (box_id, species), so mixed species and same-species-split-by-grade both work. **But** `order_lines` has `unique(order_id, species)`, which blocks ordering the same species at two grades — see Conflict C2.                                            |
| F2  | **GAP**                                  | No origin/"coming from" anywhere. `lots.location` and `orders.location` are warehouse locations, not shipment origin (Tahiti).                                                                                                                                                                                                                            |
| F3  | **PARTIAL**                              | Per-portion weight exists (`box_contents.weight`); box total is derivable (sum of contents) but there is no declared box gross weight to reconcile against, and no per-piece (individual fish) weight or piece count anywhere.                                                                                                                            |
| F4  | **GAP**                                  | Boxes carry no trucker, no pickup datetime, no direct customer. Closest is `orders.carrier` (free text) and `orders.ship_date` (date only — F4 requires date **and time**), and customer only transitively via `box_contents.assigned_order_line_id → order_lines → orders → customers`.                                                                  |
| F5  | **GAP**                                  | No MANA/EOF entity attribution on any table; no PO reference on boxes/lots/box_contents, so the "PO filled ⇒ EOF" rule cannot be represented.                                                                                                                                                                                                             |
| F6  | **GAP**                                  | `skus.code` is a single global code; no per-entity (EOF) product code, no per-entity selling price. (`order_lines.unit_price` exists but is order-scoped, unrelated.)                                                                                                                                                                                     |
| F7  | **PARTIAL**                              | `orders.carrier` / `customers.default_carrier` are free text; no freight-mode enum (trucker / air / customer self-pickup), and it lives at order level not box/shipment level.                                                                                                                                                                            |
| F8  | **GAP**                                  | No vendor/commercial invoice model at all. `invoices` is AR (customer-facing). `vendor_emails` stores raw email + `parse_status` but nothing structured (no sold-to, invoice no, terms, AWB, shipment-from, lines).                                                                                                                                       |
| F9  | **GAP**                                  | Nothing models carton references (single / range / comma-mixed) or their expansion to box rows.                                                                                                                                                                                                                                                           |
| F10 | **PARTIAL**                              | Box no / species / grade / weight covered by `boxes` + `box_contents`; `vendor_mappings.uom` covers lb/kg. Missing: box type, gel-ice type, net kg, units-per-box (pieces). `vendor_mappings` has no columns to map those fields and is keyed one-per-vendor (no per-doc-type mapping).                                                                   |
| F11 | **N/A (open question)**                  | No schema implication yet; if confirmed, add a template version tag on packing-list documents (covered by `documents.parser_version`/`kind` below).                                                                                                                                                                                                       |
| F12 | **GAP**                                  | No documents table, no filename capture, no destination-code (LAX/SFX/SFO/ORD/HNL) detection, no warehouse-vs-direct routing concept.                                                                                                                                                                                                                     |
| F13 | **GAP**                                  | No shipment entity; direct shipments (vendor → customer, bypassing warehouse) have no representation. Also see Conflict C6: current lot lifecycle + availability view assume everything is warehouse stock.                                                                                                                                               |
| F14 | **GAP**                                  | No ingestion path that builds shipment/boxes/inventory from a commercial invoice alone (packing list optional). Depends on F8/F12 structures which don't exist.                                                                                                                                                                                           |
| F15 | **GAP**                                  | AR `invoices` has header-only `amount` — no invoice lines, no per-line marked-up rate, no lineage link from customer invoice back to the vendor invoice it reformats, no shipment link.                                                                                                                                                                   |
| F16 | **COVERED**                              | Functionally replaced: per-customer orders + allocation board + `availability_by_species` view (v2 §4). No action.                                                                                                                                                                                                                                        |
| F17 | **PARTIAL**                              | `skus.qbo_item` maps to a QBO item, but there is no QBO inventory-quantity sync state, no record of "turned to bill" decrements, no generic local↔QBO object link/sync-status table (only `invoices.qbo_ref`, `credit_claims.qbo_ref`).                                                                                                                   |
| F18 | **PARTIAL**                              | `parse_status` enum (`pending/parsed/needs_review/posted`) and `vendor_emails.attachment_urls` exist; `vendor_mappings` handles CSV column maps. Missing: a first-class documents table (file storage ref, kind, parse payload, parser version), and a manual-override record (who corrected what) — override-on-everything is a stated hard requirement. |
| F19 | **GAP**                                  | No AP at all: no bills, no due dates, no payments, no aging. `vendor_statements` is reconciliation of disputes, not payables. Note F19 says AP exists "for vendors and for the system owners" ⇒ AP must be entity-scoped (MANA vs EOF).                                                                                                                   |
| F20 | **PARTIAL**                              | `purchase_orders` exists but minimal; no QBO PO id, no bulk Excel import/export batch tracking (the thing they currently pay a third-party tool for).                                                                                                                                                                                                     |
| F21 | **GAP**                                  | `purchase_orders` has no bill-conversion status, no `qbo` ids, no link to a Bill. Nothing marks POs as internal-only artifacts converted one-by-one to Bills.                                                                                                                                                                                             |
| F22 | **PARTIAL / CONFLICT**                   | Required PO fields: customer, order number, order date, items (plural), weight, box number, rate per pound. Current table has none of these — only `vendor_id, po_number, species (single), expected_lb, expected_at, status, lot_id`. Single-species flat shape conflicts with multi-item POs — see Conflict C1.                                         |
| F23 | **N/A (investigate)**                    | No immediate schema need; cheap to future-proof with a `qbo_billable boolean` + customer ref on bill/invoice lines (included below).                                                                                                                                                                                                                      |

## Part 2 — Conflicts between existing schema and new facts

- **C1. `purchase_orders` shape vs F5/F20–F22.** Single `species` + `expected_lb` per PO conflicts with "items, weight, box number, rate per pound" (multi-line) and with the PO's role as the EOF-ownership marker and the Bill-conversion source. Needs header + `purchase_order_lines`, keeping old columns only as deprecated/backfilled.
- **C2. `order_lines unique(order_id, species)` vs F1.** Same species split by grade cannot be two order lines. Replace with a unique index on `(order_id, species, coalesce(grade,''))`.
- **C3. `orders.ship_date date` + order-level `carrier` vs F4/F7.** Pickup is per-box and has a time component; freight mode and trucker are box/shipment-level. Order-level fields become defaults only.
- **C4. AR `invoices` header-only vs F15.** Reformatting a vendor invoice with marked-up per-line rates is impossible without `invoice_lines` and lineage to `vendor_invoice_lines`.
- **C5. `vendor_mappings unique(vendor_id)` vs F8/F10.** One mapping per vendor can't cover two distinct doc types (packing list vs commercial invoice) with different columns; also missing pieces/box-type/ice/net-kg mappings.
- **C6. Warehouse-only lifecycle vs F12/F13.** `lot_status` (`incoming→received→available→allocated→shipped`), `lots.location`, and `availability_by_species` assume all stock lands in a warehouse. Direct shipments (ORD/HNL) never do; without a routing flag they would surface as sellable warehouse availability. The view must exclude direct-routed shipments.
- **C7. Global `skus.code` vs F6.** EOF uses different product codes; a single code column can't hold both entities' codes or the EOF selling price.
- **C8. `boxes.lot_id not null` + `unique(lot_id,label)` vs direct flow.** Acceptable if every shipment (incl. direct) still creates a lot, but the lot then needs shipment/routing linkage (added below); flagging so the ingestion design keeps creating lots for direct shipments rather than orphan boxes.

## Part 3 — Migration v3 design (proposed DDL)

Order matters: enums → `documents`/`shipments` → box/lot alters → vendor invoices → AP → PO v2 → AR lines → entity codes → mapping fixes → views. FK direction chosen to avoid cycles (`ap_bills` points at `vendor_invoices`/`purchase_orders`, never the reverse).

```sql
-- ---------- ENUMS ----------
create type operating_entity as enum ('MANA','EOF');                      -- F5, F19
create type shipment_routing as enum ('warehouse','direct');              -- F12, F13
create type freight_mode     as enum ('trucker','air','customer_pickup'); -- F7
create type document_kind    as enum ('commercial_invoice','packing_list',
                                      'vendor_statement','po_import','other'); -- F8, F10, F20
create type vendor_invoice_status as enum ('draft','parsed','needs_review',
                                           'approved','billed','void');   -- F8, F18
create type ap_bill_status   as enum ('draft','pending_sync','synced',
                                      'partially_paid','paid','void');    -- F19, F21
create type po_bill_status   as enum ('not_billed','partially_billed','billed'); -- F21

-- ---------- DOCUMENTS (F8, F10, F12, F14, F18) ----------
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
  routing_detected   shipment_routing,            -- LAX/SFX/SFO -> 'warehouse'; ORD/HNL -> 'direct'
  parse_status       parse_status not null default 'pending',  -- reuse existing enum (F18)
  parsed_payload     jsonb,                       -- raw parser output before posting
  parse_error        text,
  parser_version     text,                        -- also answers F11 template-version tracking
  reviewed_by        uuid references public.profiles(id) on delete set null, -- manual override actor
  reviewed_at        timestamptz,
  manual_overrides   jsonb not null default '{}'::jsonb, -- {field: {from,to,by,at}} audit of corrections
  created_at         timestamptz not null default now()
);
create index idx_documents_vendor on public.documents(vendor_id, kind, parse_status);

-- ---------- SHIPMENTS (F2, F8-AWB, F12, F13, F14) ----------
create table public.shipments (
  id               uuid primary key default gen_random_uuid(),
  vendor_id        uuid not null references public.vendors(id) on delete restrict,
  awb              text,                          -- air waybill (F8)
  origin           text,                          -- "coming from", e.g. 'Tahiti' (F2)
  routing          shipment_routing not null default 'warehouse',
  destination_code text,                          -- LAX/SFO/ORD/HNL
  customer_id      uuid references public.customers(id) on delete set null, -- required app-side when routing='direct'
  entity           operating_entity not null default 'MANA',
  eta              timestamptz,
  arrived_at       timestamptz,
  status           text not null default 'expected'
                   check (status in ('expected','in_transit','arrived','delivered','cancelled')),
  packing_list_document_id      uuid references public.documents(id) on delete set null, -- may stay null (F14)
  commercial_invoice_document_id uuid references public.documents(id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now()
);
create index idx_shipments_vendor on public.shipments(vendor_id, status);
alter table public.documents add column shipment_id uuid references public.shipments(id) on delete set null;

alter table public.lots
  add column shipment_id uuid references public.shipments(id) on delete set null,
  add column origin text;   -- denorm/manual-entry fallback when no shipment record (F2)

-- ---------- BOX-LEVEL LOGISTICS & PHYSICALS (F3, F4, F5, F7, F10) ----------
alter table public.boxes
  add column trucker           text,                                   -- F4
  add column freight_mode      freight_mode,                           -- F7
  add column pickup_at         timestamptz,                            -- F4: date AND time
  add column customer_id       uuid references public.customers(id) on delete set null, -- F4 (planned recipient; allocation via box_contents remains authoritative for warehouse flow)
  add column box_type          text,                                   -- F10
  add column ice_type          text,                                   -- F10 gel ice
  add column net_kg            numeric(10,3),                          -- F10
  add column gross_weight_lb   numeric(10,2),                          -- F3 declared total, reconcile vs sum(box_contents.weight)
  add column pieces            int,                                    -- F10 unit/box
  add column purchase_order_id uuid references public.purchase_orders(id) on delete set null, -- F5
  add column entity            operating_entity not null default 'MANA'; -- F5: set 'EOF' when purchase_order_id filled
create index idx_boxes_pickup on public.boxes(pickup_at);
create index idx_boxes_po     on public.boxes(purchase_order_id);

alter table public.box_contents add column pieces int;                 -- pieces per portion (F8 qty pieces)

-- optional per-fish granularity (F3: "each individual fish has its own weight")
create table public.box_pieces (
  id             uuid primary key default gen_random_uuid(),
  box_content_id uuid not null references public.box_contents(id) on delete cascade,
  piece_no       int not null,
  weight_lb      numeric(10,2) not null,
  unique (box_content_id, piece_no)
);

-- ---------- VENDOR (COMMERCIAL) INVOICES (F8, F9, F14, F18) ----------
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

create table public.vendor_invoice_lines (
  id                uuid primary key default gen_random_uuid(),
  vendor_invoice_id uuid not null references public.vendor_invoices(id) on delete cascade,
  line_no           int,
  description       text,                          -- F8 descriptions
  species           text,
  grade             text,
  carton_ref_raw    text,                          -- F9 verbatim: '5004' | '5005-5009' | '5004, 5006-5008'
  carton_numbers    int[],                         -- parsed expansion of the above
  pieces            int,                           -- F8 quantity pieces
  weight_lb         numeric(12,2),
  unit_price_lb     numeric(10,4),
  amount            numeric(12,2),
  manual_overrides  jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index idx_vil_invoice on public.vendor_invoice_lines(vendor_invoice_id);

-- resolved carton refs -> actual boxes (after ingestion matches labels)
create table public.vendor_invoice_line_boxes (
  vendor_invoice_line_id uuid not null references public.vendor_invoice_lines(id) on delete cascade,
  box_id                 uuid not null references public.boxes(id) on delete cascade,
  primary key (vendor_invoice_line_id, box_id)
);

-- ---------- ACCOUNTS PAYABLE (F19, F21) ----------
create table public.ap_bills (
  id                uuid primary key default gen_random_uuid(),
  vendor_id         uuid not null references public.vendors(id) on delete restrict,
  entity            operating_entity not null default 'MANA',  -- F19: separate AP per operating entity
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

create table public.ap_payment_applications (     -- one payment can settle N bills
  id         uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.ap_payments(id) on delete cascade,
  bill_id    uuid not null references public.ap_bills(id) on delete cascade,
  amount     numeric(12,2) not null,
  unique (payment_id, bill_id)
);

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

-- ---------- PURCHASE ORDERS v2 (F5, F20, F21, F22) ----------
alter table public.purchase_orders
  add column customer_id     uuid references public.customers(id) on delete set null, -- F22
  add column order_id        uuid references public.orders(id) on delete set null,    -- F22 "order number"
  add column order_date      date,                                                    -- F22
  add column entity          operating_entity not null default 'EOF',                 -- F5: PO presence = EOF
  add column qbo_po_id       text,                                                    -- F20
  add column bill_status     po_bill_status not null default 'not_billed',            -- F21 (internal-only, converted to Bill)
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
  box_id            uuid references public.boxes(id) on delete set null,
  weight_lb         numeric(12,2),                 -- F22
  rate_per_lb       numeric(10,4),                 -- F22
  amount            numeric(12,2) generated always as
                    (round(coalesce(weight_lb,0) * coalesce(rate_per_lb,0), 2)) stored,
  created_at        timestamptz not null default now()
);
create index idx_pol_po on public.purchase_order_lines(purchase_order_id);

-- backfill: one line per legacy single-species PO, then deprecate old columns
insert into public.purchase_order_lines (purchase_order_id, species, weight_lb)
select id, species, expected_lb from public.purchase_orders;
-- keep purchase_orders.species / expected_lb until the UI migrates, then:
-- alter table public.purchase_orders drop column species, drop column expected_lb;

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

-- ---------- AR INVOICE LINES + DIRECT-SHIPMENT RE-INVOICING (F15, F23) ----------
alter table public.invoices
  add column entity                   operating_entity not null default 'MANA',
  add column shipment_id              uuid references public.shipments(id) on delete set null,
  add column source_vendor_invoice_id uuid references public.vendor_invoices(id) on delete set null; -- middleman lineage: NEVER forward vendor invoice

create table public.invoice_lines (
  id                            uuid primary key default gen_random_uuid(),
  invoice_id                    uuid not null references public.invoices(id) on delete cascade,
  source_vendor_invoice_line_id uuid references public.vendor_invoice_lines(id) on delete set null, -- same boxes/items, different rate (F15)
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

-- ---------- PER-ENTITY PRODUCT CODES (F5, F6, F17) ----------
create table public.sku_entity_codes (
  id                    uuid primary key default gen_random_uuid(),
  sku_code              text not null references public.skus(code) on update cascade on delete cascade,
  entity                operating_entity not null,
  code                  text not null,              -- EOF product code (F6)
  qbo_item_id           text,                       -- per-entity QBO item (F17)
  default_selling_price numeric(10,2),              -- "selling price sometimes written on it" (F6)
  unique (entity, code),
  unique (sku_code, entity)
);

-- ---------- QBO OBJECT LINKS / SYNC STATE (F17, F20, F21) ----------
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

-- ---------- CONFLICT FIXES ----------
-- C2: allow same species at multiple grades on one order (F1)
alter table public.order_lines drop constraint order_lines_order_id_species_key;
create unique index order_lines_order_species_grade_ux
  on public.order_lines (order_id, species, coalesce(grade, ''));

-- C5: vendor_mappings per doc type + missing packing-list fields (F8, F10)
alter table public.vendor_mappings
  drop constraint vendor_mappings_vendor_id_key,
  add column doc_type     document_kind not null default 'packing_list',
  add column pieces_col   text,          -- unit/box
  add column box_type_col text,
  add column ice_col      text,
  add column net_kg_col   text,
  add constraint vendor_mappings_vendor_doc_ux unique (vendor_id, doc_type);

-- C6: availability must exclude direct-routed stock (F12, F13)
create or replace view public.availability_by_species
with (security_invoker = true) as
select bc.species, l.location,
  sum(bc.weight) filter (where bc.assigned_order_line_id is null)::numeric(12,2)     as available_lb,
  sum(bc.weight) filter (where bc.assigned_order_line_id is not null)::numeric(12,2) as allocated_lb,
  sum(bc.weight) filter (where l.status::text = 'incoming')::numeric(12,2)           as incoming_lb
from public.box_contents bc
join public.boxes b on b.id = bc.box_id
join public.lots  l on l.id = b.lot_id
left join public.shipments s on s.id = l.shipment_id
where l.status::text in ('incoming','received','available','allocated')
  and coalesce(s.routing, 'warehouse') = 'warehouse'
group by bc.species, l.location;
```

RLS/grants (not shown, same convention as v2): staff-read on all new tables; write gated `admin/operations` for shipments/documents/boxes changes, `admin/finance` for `vendor_invoices`, `ap_*`, `purchase_orders`, `invoice_lines`, `po_import_batches`, `sku_entity_codes`; `qbo_object_links` service-role-only like `integration_tokens`. Add `documents`, `shipments`, `ap_bills` to the realtime publication if the finance queue should stream.

## Part 4 — Remaining notes for the analyst

- **Entity derivation rule (F5):** enforce app-side or via trigger: `boxes.entity = 'EOF' when purchase_order_id is not null else 'MANA'`. Kept as a stored column (not generated) because the transition rule may gain exceptions.
- **Direct-shipment flow (F13/F15):** direct shipments still create `shipments` + `lots` + `boxes` (so credits/downgrades/AP keep working) but with `routing='direct'`; they skip the allocation board and availability, and feed straight into `vendor_invoices → invoices(+lines)` re-invoicing.
- **`orders.ship_date`/`carrier` remain as defaults**; `boxes.pickup_at`/`trucker`/`freight_mode` are authoritative (C3).
- **F17 open design question:** whether inventory quantity truth stays in QBO (system mirrors via `qbo_object_links` + item mapping) or moves into this schema (would need an `inventory_events` ledger). Not included in v3 — decide after the QBO integration spike; `qbo_billable` (F23) is stubbed on `invoice_lines`.
- **F11:** unresolved; `documents.parser_version` + `kind='packing_list'` gives a place to track template conformity once confirmed.
