-- =============================================================================
-- MANA — Order delivery details (customer portal)
--
-- Customers place orders with a delivery contact, a delivery address, and a
-- shipment method. The method uses the documented freight_mode values
-- (F7: trucker / air / customer_pickup). Contact defaults from their account
-- but can be overridden per order; address is captured per order (a customer
-- can deliver to different places).
--
-- Run AFTER 20260710100004_customer_tier_optional.sql. Safe to re-run.
-- =============================================================================

-- Optional default delivery address on the account (portal also remembers the
-- last-used address from the customer's most recent order).
alter table public.customers
  add column if not exists address text;

-- Per-order delivery details.
alter table public.orders
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists delivery_address text,
  add column if not exists freight_mode text
    check (freight_mode is null or freight_mode in ('trucker', 'air', 'customer_pickup'));
