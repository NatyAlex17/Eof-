-- =============================================================================
-- MANA — Customer tier becomes optional (assigned by staff)
--
-- Self-signup customers start with NO tier. Pricing is only shown in the portal
-- once a staff member (admin / operations / sales / finance) assigns a tier.
-- Finance is added to the customers write policy so they can set tiers too.
--
-- Run AFTER 20260710100003_customer_portal.sql. Safe to re-run.
-- =============================================================================

-- Tier is no longer forced to T2 — leave it NULL until staff assign it.
alter table public.customers alter column tier drop default;
alter table public.customers alter column tier drop not null;

-- Finance can assign tiers / edit customers alongside admin, operations, sales.
drop policy if exists "customers_write" on public.customers;
create policy "customers_write" on public.customers
  for all to authenticated
  using (public.app_role() in ('admin', 'operations', 'sales', 'finance'))
  with check (public.app_role() in ('admin', 'operations', 'sales', 'finance'));
