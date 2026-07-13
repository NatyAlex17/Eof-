-- =============================================================================
-- MANA — Link inventory lots to shipments
--
-- When staff accept a vendor packing list and create a shipment, the packing
-- list lines are materialized into a lot → boxes → box_contents so the fish
-- shows up on the Allocation Board as draggable inventory.
--
-- schema_v3 (20260710120001) deferred lots.shipment_id to "v4"; this is it.
-- Run AFTER 20260711100004_claim_evidence.sql. Safe to re-run.
-- =============================================================================

alter table public.lots
  add column if not exists shipment_id uuid references public.shipments(id) on delete set null;

create index if not exists idx_lots_shipment on public.lots(shipment_id);
