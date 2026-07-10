-- =============================================================================
-- MANA — Schema v4 DRAFT (part 2 of 2): boxes / lots / box_contents additions
--
-- ⚠️  DO NOT APPLY YET. This file lives in supabase/drafts/ (NOT migrations/)
--     on purpose: it alters boxes, lots and box_contents, which Dev A is
--     actively wiring (allocation board, inventory, split/merge). Apply only
--     after agreeing timing with Dev A, then:
--       1. move to supabase/migrations/ with a fresh timestamp filename
--       2. apply
--       3. regenerate apps/web/src/lib/database.types.ts in the same PR
--
-- DEPENDS ON: 20260710120001_schema_v3_new_tables.sql (operating_entity,
-- freight_mode, shipment_routing enums; shipments; purchase_orders v2).
--
-- Implements the remaining finance-analysis DDL: F2, F3, F4, F5, F7, F10, C3, C6.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- LOTS: shipment linkage + origin  (F2; C8 — direct shipments still create lots)
-- -----------------------------------------------------------------------------
alter table public.lots
  add column shipment_id uuid references public.shipments(id) on delete set null,
  add column origin      text;   -- denorm/manual-entry fallback when no shipment record
create index idx_lots_shipment on public.lots(shipment_id);

-- -----------------------------------------------------------------------------
-- BOXES: logistics + physicals + entity  (F3, F4, F5, F7, F10)
-- orders.ship_date/carrier remain as DEFAULTS only; these are authoritative (C3).
-- -----------------------------------------------------------------------------
alter table public.boxes
  add column trucker           text,                                   -- F4
  add column freight_mode      freight_mode,                           -- F7 trucker/air/customer_pickup
  add column pickup_at         timestamptz,                            -- F4: date AND time
  add column customer_id       uuid references public.customers(id) on delete set null, -- F4 planned recipient (direct flow); box_contents assignment stays authoritative for warehouse flow
  add column box_type          text,                                   -- F10
  add column ice_type          text,                                   -- F10 gel ice
  add column net_kg            numeric(10,3),                          -- F10
  add column gross_weight_lb   numeric(10,2),                          -- F3 declared total, reconcile vs sum(box_contents.weight)
  add column pieces            int,                                    -- F10 units per box
  add column purchase_order_id uuid references public.purchase_orders(id) on delete set null, -- F5
  add column entity            operating_entity not null default 'MANA'; -- F5: 'EOF' when purchase_order_id is filled (rule enforced app-side; may gain exceptions, so stored not generated)
create index idx_boxes_pickup on public.boxes(pickup_at);
create index idx_boxes_po     on public.boxes(purchase_order_id);

alter table public.box_contents add column pieces int;                 -- pieces per portion (F8)

-- -----------------------------------------------------------------------------
-- OPTIONAL PER-FISH GRANULARITY  (F3: each individual fish has its own weight)
-- -----------------------------------------------------------------------------
create table public.box_pieces (
  id             uuid primary key default gen_random_uuid(),
  box_content_id uuid not null references public.box_contents(id) on delete cascade,
  piece_no       int not null,
  weight_lb      numeric(10,2) not null,
  unique (box_content_id, piece_no)
);

grant select, insert, update, delete on public.box_pieces to authenticated;
alter table public.box_pieces enable row level security;
create policy "box_pieces_read"  on public.box_pieces for select to authenticated using (true);
create policy "box_pieces_write" on public.box_pieces for all to authenticated
  using (public.app_role() in ('admin','operations'))
  with check (public.app_role() in ('admin','operations'));

-- -----------------------------------------------------------------------------
-- C6 FIX: availability must exclude direct-routed stock  (F12, F13)
-- Requires lots.shipment_id above. Direct shipments (ORD/HNL) never land in a
-- warehouse and must not surface as sellable availability.
-- ⚠️ Dev A's availability strip reads this view — flag the change to them.
-- -----------------------------------------------------------------------------
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
