-- =============================================================================
-- MANA — SKU pricing (run once, after the previous migrations)
--   1. skus gain a base price per lb + description (the species catalog)
--   2. tier_species_prices: species-specific price per tier — beats the
--      tier multiplier when present (Blake: one current pricing source)
-- Precedence at quote time: customer price_override > tier_species_price
--                            > skus.base_price_lb × pricing_tiers.base_multiplier
-- =============================================================================

alter table public.skus
  add column if not exists base_price_lb numeric(10,2),
  add column if not exists description   text;

create table if not exists public.tier_species_prices (
  id         uuid primary key default gen_random_uuid(),
  tier       text not null references public.pricing_tiers(tier) on delete cascade,
  sku_code   text not null references public.skus(code) on update cascade on delete cascade,
  price_lb   numeric(10,2) not null,
  updated_at timestamptz not null default now(),
  unique (tier, sku_code)
);

grant select, insert, update, delete on public.tier_species_prices to authenticated;
alter table public.tier_species_prices enable row level security;

create policy "tsp_read" on public.tier_species_prices
  for select to authenticated using (true);
create policy "tsp_write" on public.tier_species_prices
  for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

-- Seed base prices + descriptions for the existing catalog (idempotent)
update public.skus set
  base_price_lb = coalesce(base_price_lb, x.price),
  description   = coalesce(description, x.descr)
from (values
  ('AHI-A+', 28.50, 'Sashimi-grade ahi tuna loins, premium'),
  ('AHI-A',  26.00, 'Ahi tuna loins, grade A'),
  ('ONO-A',  22.00, 'Ono (wahoo) fillets, grade A'),
  ('SAL-A',  16.50, 'Salmon fillets, grade A')
) as x(code, price, descr)
where public.skus.code = x.code;
