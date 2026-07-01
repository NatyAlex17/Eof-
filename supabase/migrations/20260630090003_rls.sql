-- =============================================================================
-- MANA — Row Level Security
-- Model: every authenticated staff member can READ operational data;
--        WRITES are gated by role via app_role().
--        Secrets (integration_tokens) are denied to everyone (service role only).
-- Tighten reads later if you need per-location or per-customer scoping.
-- =============================================================================

-- Baseline table/function grants (RLS still gates actual row access).
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- -----------------------------------------------------------------------------
-- PROFILES
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_read" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.app_role() = 'admin')
  with check (id = auth.uid() or public.app_role() = 'admin');

create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Helper convention for the operational tables:
--   <table>_read  : SELECT for any authenticated user
--   <table>_write : ALL  for the listed roles
-- -----------------------------------------------------------------------------

-- vendors (admin)
alter table public.vendors enable row level security;
create policy "vendors_read"  on public.vendors for select to authenticated using (true);
create policy "vendors_write" on public.vendors for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- customers (admin, operations, sales)
alter table public.customers enable row level security;
create policy "customers_read"  on public.customers for select to authenticated using (true);
create policy "customers_write" on public.customers for all to authenticated
  using (public.app_role() in ('admin','operations','sales'))
  with check (public.app_role() in ('admin','operations','sales'));

-- price_overrides (admin, finance)
alter table public.price_overrides enable row level security;
create policy "price_overrides_read"  on public.price_overrides for select to authenticated using (true);
create policy "price_overrides_write" on public.price_overrides for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

-- skus (admin)
alter table public.skus enable row level security;
create policy "skus_read"  on public.skus for select to authenticated using (true);
create policy "skus_write" on public.skus for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- pricing_tiers (admin)
alter table public.pricing_tiers enable row level security;
create policy "pricing_tiers_read"  on public.pricing_tiers for select to authenticated using (true);
create policy "pricing_tiers_write" on public.pricing_tiers for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- lots (admin, operations)
alter table public.lots enable row level security;
create policy "lots_read"  on public.lots for select to authenticated using (true);
create policy "lots_write" on public.lots for all to authenticated
  using (public.app_role() in ('admin','operations'))
  with check (public.app_role() in ('admin','operations'));

-- orders (admin, operations, sales)
alter table public.orders enable row level security;
create policy "orders_read"  on public.orders for select to authenticated using (true);
create policy "orders_write" on public.orders for all to authenticated
  using (public.app_role() in ('admin','operations','sales'))
  with check (public.app_role() in ('admin','operations','sales'));

-- boxes (admin, operations)
alter table public.boxes enable row level security;
create policy "boxes_read"  on public.boxes for select to authenticated using (true);
create policy "boxes_write" on public.boxes for all to authenticated
  using (public.app_role() in ('admin','operations'))
  with check (public.app_role() in ('admin','operations'));

-- board_locks (admin, operations) — usually written via lock_board() RPC
alter table public.board_locks enable row level security;
create policy "board_locks_read"  on public.board_locks for select to authenticated using (true);
create policy "board_locks_write" on public.board_locks for all to authenticated
  using (public.app_role() in ('admin','operations'))
  with check (public.app_role() in ('admin','operations'));

-- pick_slips (admin, operations)
alter table public.pick_slips enable row level security;
create policy "pick_slips_read"  on public.pick_slips for select to authenticated using (true);
create policy "pick_slips_write" on public.pick_slips for all to authenticated
  using (public.app_role() in ('admin','operations'))
  with check (public.app_role() in ('admin','operations'));

-- invoices (admin, finance)
alter table public.invoices enable row level security;
create policy "invoices_read"  on public.invoices for select to authenticated using (true);
create policy "invoices_write" on public.invoices for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

-- credit_claims (admin, finance, sales)
alter table public.credit_claims enable row level security;
create policy "credit_claims_read"  on public.credit_claims for select to authenticated using (true);
create policy "credit_claims_write" on public.credit_claims for all to authenticated
  using (public.app_role() in ('admin','finance','sales'))
  with check (public.app_role() in ('admin','finance','sales'));

-- downgrades (admin, operations)
alter table public.downgrades enable row level security;
create policy "downgrades_read"  on public.downgrades for select to authenticated using (true);
create policy "downgrades_write" on public.downgrades for all to authenticated
  using (public.app_role() in ('admin','operations'))
  with check (public.app_role() in ('admin','operations'));

-- vendor_statements (admin, finance)
alter table public.vendor_statements enable row level security;
create policy "vendor_statements_read"  on public.vendor_statements for select to authenticated using (true);
create policy "vendor_statements_write" on public.vendor_statements for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

-- statement_lines (admin, finance)
alter table public.statement_lines enable row level security;
create policy "statement_lines_read"  on public.statement_lines for select to authenticated using (true);
create policy "statement_lines_write" on public.statement_lines for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

-- vendor_emails (admin, finance) — usually written by the server ingest job
alter table public.vendor_emails enable row level security;
create policy "vendor_emails_read"  on public.vendor_emails for select to authenticated using (true);
create policy "vendor_emails_write" on public.vendor_emails for all to authenticated
  using (public.app_role() in ('admin','finance'))
  with check (public.app_role() in ('admin','finance'));

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS — users see only their own (admins see all)
-- -----------------------------------------------------------------------------
alter table public.notifications enable row level security;
create policy "notif_read_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.app_role() = 'admin');
create policy "notif_insert" on public.notifications
  for insert to authenticated with check (true);
create policy "notif_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- AUDIT_LOG — anyone authenticated may append; only admin/finance may read
-- -----------------------------------------------------------------------------
alter table public.audit_log enable row level security;
create policy "audit_read" on public.audit_log
  for select to authenticated using (public.app_role() in ('admin','finance'));
create policy "audit_insert" on public.audit_log
  for insert to authenticated with check (true);

-- -----------------------------------------------------------------------------
-- INTEGRATION_TOKENS — RLS on, NO policies => denied to all API roles.
-- Only the service role (server-side, bypasses RLS) can read/write secrets.
-- -----------------------------------------------------------------------------
alter table public.integration_tokens enable row level security;
revoke all on public.integration_tokens from authenticated, anon;
