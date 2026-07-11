-- =============================================================================
-- MANA — Delivery-vs-pickup + staff transport fee
--
-- The customer portal now offers a simple choice: delivery or pickup.
--   • pickup  -> freight_mode = 'customer_pickup', no transport fee
--   • delivery-> freight_mode = 'delivery', staff add a transport fee later
-- transport_fee is entered by staff on the Orders page and stored on the order.
--
-- Run AFTER 20260710100005_order_delivery.sql. Safe to re-run.
-- =============================================================================

-- Allow 'delivery' as a freight mode (keep the old values for existing rows).
do $$
declare
  v_name text;
begin
  select conname into v_name
  from pg_constraint
  where conrelid = 'public.orders'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%freight_mode%';
  if v_name is not null then
    execute format('alter table public.orders drop constraint %I', v_name);
  end if;
end $$;

alter table public.orders
  add constraint orders_freight_mode_check
  check (
    freight_mode is null
    or freight_mode in ('trucker', 'air', 'customer_pickup', 'delivery')
  );

-- Transport fee staff add for delivery orders (null until entered).
alter table public.orders
  add column if not exists transport_fee numeric(12, 2);
