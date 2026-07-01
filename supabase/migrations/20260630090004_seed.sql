-- =============================================================================
-- MANA — Seed data (mirrors the UI mock so the app shows real rows immediately)
-- Idempotent: safe to re-run. Runs as postgres, so it bypasses RLS.
-- Users/profiles are NOT seeded — they come from real signups (1st = admin).
-- =============================================================================

-- Vendors (the three Vendor Recon tabs: kona / pacific / island)
insert into public.vendors (name, code, terms, contact_email) values
  ('Kona Fresh Catch',     'kona',    'Net 14', 'settlements@konafresh.example'),
  ('Pacific Blue Seafood', 'pacific', 'Net 14', 'ap@pacificblue.example'),
  ('Island Direct',        'island',  'Net 7',  'recon@islanddirect.example')
on conflict (code) do nothing;

-- Pricing tiers (labels from the Customers page TIER_META)
insert into public.pricing_tiers (tier, label, terms, base_multiplier) values
  ('T1', 'Tier 1 — Premium',  'Net 15', 1.000),
  ('T2', 'Tier 2 — Standard', 'Net 30', 0.920),
  ('T3', 'Tier 3 — COD',      'COD',    0.850)
on conflict (tier) do nothing;

-- SKUs
insert into public.skus (code, species, grade, pack_type, uom, qbo_item, active) values
  ('AHI-A+', 'Ahi Tuna', 'A+', 'Loin',    'lb', 'Ahi Tuna A+', true),
  ('AHI-A',  'Ahi Tuna', 'A',  'Loin',    'lb', 'Ahi Tuna A',  true),
  ('SAL-A',  'Salmon',   'A',  'Fillet',  'lb', 'Salmon A',    true),
  ('ONO-A',  'Ono',      'A',  'Steak',   'lb', 'Ono A',       true)
on conflict (code) do nothing;

-- Customers
insert into public.customers
  (name, contact, phone, email, tier, default_carrier, terms, location, standing_order, channel_pref, status) values
  ('Nobu',         'Nobu Matsuhisa', '(415) 555-0188', 'orders@nobu-sf.com',    'T1', 'Main Freight',     'Net 15', 'SFO', 'Mon/Thu — Ahi A+, 40 lb', 'Phone', 'active'),
  ('Morimoto',     'M. Kitchen',     '(415) 555-0204', 'purchasing@morimoto.com','T1', 'Main Freight',     'Net 15', 'SFO', 'Wed — Salmon A, 30 lb',   'Email', 'active'),
  ('Roy''s',       'Roy Yamaguchi',  '(310) 555-0142', 'kitchen@roys.com',      'T2', 'Gold Coast 3PL',   'Net 30', 'LAX', null,                      'Text',  'active'),
  ('Alan Wong''s', 'Alan Wong',      '(808) 555-0190', 'orders@alanwongs.com',  'T2', 'Island Air Cargo', 'Net 30', 'LAX', null,                      'Phone', 'active'),
  ('Tiki''s Grill','Front desk',     '(808) 555-0233', 'tikis@grill.com',       'T3', 'Customer pickup',  'COD',    'SFO', null,                      'Phone', 'inactive')
on conflict (name) do nothing;

-- Nobu price override (from the Customers page)
insert into public.price_overrides (customer_id, sku, species, price, effective_from)
values ((select id from public.customers where name = 'Nobu'), 'AHI-A+', 'Ahi Tuna A+', 24.50, '2026-06-01')
on conflict (customer_id, sku) do nothing;

-- Open orders
insert into public.orders (customer_id, code, tier, carrier, species, target_weight, ship_date, location, status, color) values
  ((select id from public.customers where name = 'Nobu'),     'NOBU-2208', 'Tier 1', 'Air Cargo', 'Ahi Tuna', 90, current_date + 1, 'SFO', 'open', '#3F6F86'),
  ((select id from public.customers where name = 'Morimoto'), 'MORI-2207', 'Tier 1', 'Air Cargo', 'Salmon',   60, current_date + 1, 'SFO', 'open', '#C2453A')
on conflict (code) do nothing;

-- A received lot
insert into public.lots (lot_code, vendor_id, species, grade, status, received_at, location)
values ('LOT-2207', (select id from public.vendors where code = 'kona'), 'Ahi Tuna', 'A+', 'available', now() - interval '6 hours', 'SFO')
on conflict (lot_code) do nothing;

-- Boxes: two assigned to Nobu (40.5 + 40.5 = 81), two left available -> "81 / 90"
insert into public.boxes (lot_id, label, idx, weight, species, grade, assigned_order_id, status, locked) values
  ((select id from public.lots where lot_code = 'LOT-2207'), 'B-4471', 1, 40.5, 'Ahi Tuna', 'A+', (select id from public.orders where code = 'NOBU-2208'), 'allocated', false),
  ((select id from public.lots where lot_code = 'LOT-2207'), 'B-4472', 2, 40.5, 'Ahi Tuna', 'A+', (select id from public.orders where code = 'NOBU-2208'), 'allocated', false),
  ((select id from public.lots where lot_code = 'LOT-2207'), 'B-4473', 3, 42.0, 'Ahi Tuna', 'A+', null, 'available', false),
  ((select id from public.lots where lot_code = 'LOT-2207'), 'B-4474', 4, 39.0, 'Ahi Tuna', 'A+', null, 'available', false)
on conflict (lot_id, label) do nothing;

-- A couple of pending invoices (Finance Queue)
insert into public.invoices (order_id, customer_id, invoice_no, amount, terms, status) values
  ((select id from public.orders where code = 'NOBU-2208'), (select id from public.customers where name = 'Nobu'),     'INV-2208', 2814.20, 'Tier 1 · Net 15', 'pending'),
  ((select id from public.orders where code = 'MORI-2207'), (select id from public.customers where name = 'Morimoto'), 'INV-2207', 1640.50, 'Tier 1 · Net 15', 'pending')
on conflict (invoice_no) do nothing;
