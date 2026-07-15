-- =============================================================================
-- MANA — Owner (CEO) + per-role page access
--
-- Blake (the CEO) is the OWNER: he sees every page, is the only one who can
-- assign roles, and configures which /mana pages each staff role can see.
--
-- Design notes:
--   * Owner is a FLAG on profiles (is_owner), not a new role. Every existing
--     RLS policy checks app_role() in ('admin', ...) — a brand-new 'owner'
--     role would silently lose write access everywhere. Blake keeps role
--     'admin' (full table access) + is_owner = true (owner-only powers).
--   * role_page_access is deny-by-default per page: a (role, page_key) row
--     means that role can see that page. A role with ZERO rows falls back to
--     "allow everything" in the app so a half-run migration can't lock the
--     team out.
--
-- AFTER RUNNING: make Blake the owner (SQL editor runs bypass the trigger):
--   update public.profiles set is_owner = true where email = 'blake@YOURDOMAIN.com';
--
-- Run AFTER 20260711100005_lot_shipment_link.sql. Safe to re-run.
-- =============================================================================

-- 1. Owner flag ---------------------------------------------------------------
alter table public.profiles
  add column if not exists is_owner boolean not null default false;

create or replace function public.app_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_owner from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.app_is_owner() to authenticated;

-- 2. Only the owner may change roles / the owner flag -------------------------
-- Trigger (not RLS) so it holds on EVERY write path. auth.uid() is null when
-- running from the SQL editor / service role — allowed, so the owner can be
-- bootstrapped and support fixes stay possible.
create or replace function public.enforce_owner_only_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- SQL editor / service role
  end if;
  if (new.role is distinct from old.role or new.is_owner is distinct from old.is_owner)
     and not public.app_is_owner() then
    raise exception 'Only the owner can assign roles';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_owner_only_role_changes on public.profiles;
create trigger trg_owner_only_role_changes
  before update on public.profiles
  for each row execute function public.enforce_owner_only_role_changes();

-- 3. Per-role page access ------------------------------------------------------
create table if not exists public.role_page_access (
  id         uuid primary key default gen_random_uuid(),
  role       text not null,
  page_key   text not null,
  created_at timestamptz not null default now(),
  unique (role, page_key)
);

alter table public.role_page_access enable row level security;

-- Staff read it (the nav needs it); external roles have no use for it.
drop policy if exists "role_page_access_read" on public.role_page_access;
create policy "role_page_access_read" on public.role_page_access
  for select to authenticated
  using (public.app_role()::text not in ('customer', 'vendor'));

-- Only the owner configures it.
drop policy if exists "role_page_access_write" on public.role_page_access;
create policy "role_page_access_write" on public.role_page_access
  for all to authenticated
  using (public.app_is_owner())
  with check (public.app_is_owner());

-- 4. Seed sensible defaults (Blake can change all of this in Admin) ------------
-- Page keys mirror the /mana routes.
insert into public.role_page_access (role, page_key)
select r.role, p.page_key
from (values
  -- admin: everything
  ('admin', 'allocation-board'), ('admin', 'order-intake'), ('admin', 'order-inbox'),
  ('admin', 'orders'), ('admin', 'inventory'), ('admin', 'customers'),
  ('admin', 'pick-slips'), ('admin', 'documents'), ('admin', 'price-sheet'),
  ('admin', 'purchase-orders'), ('admin', 'finance-queue'), ('admin', 'credits'),
  ('admin', 'vendor-reconciliation'), ('admin', 'operations-dashboard'),
  ('admin', 'finance-dashboard'), ('admin', 'ceo-dashboard'), ('admin', 'notifications'),
  ('admin', 'vendor-verification'), ('admin', 'settings'), ('admin', 'admin'),
  -- operations: the ops spine
  ('operations', 'allocation-board'), ('operations', 'order-intake'),
  ('operations', 'order-inbox'), ('operations', 'orders'), ('operations', 'inventory'),
  ('operations', 'customers'), ('operations', 'pick-slips'), ('operations', 'documents'),
  ('operations', 'operations-dashboard'), ('operations', 'notifications'),
  ('operations', 'vendor-verification'), ('operations', 'settings'),
  -- finance: only what finance needs
  ('finance', 'price-sheet'), ('finance', 'purchase-orders'), ('finance', 'finance-queue'),
  ('finance', 'credits'), ('finance', 'vendor-reconciliation'),
  ('finance', 'finance-dashboard'), ('finance', 'notifications'), ('finance', 'settings'),
  -- sales: intake + customers + pricing
  ('sales', 'order-intake'), ('sales', 'order-inbox'), ('sales', 'orders'),
  ('sales', 'customers'), ('sales', 'price-sheet'), ('sales', 'notifications'),
  ('sales', 'settings'),
  -- logistics: movement of product
  ('logistics', 'allocation-board'), ('logistics', 'orders'), ('logistics', 'inventory'),
  ('logistics', 'pick-slips'), ('logistics', 'documents'),
  ('logistics', 'operations-dashboard'), ('logistics', 'notifications'),
  ('logistics', 'settings'),
  -- viewer: read-only overviews
  ('viewer', 'operations-dashboard'), ('viewer', 'finance-dashboard'),
  ('viewer', 'settings')
) as r(role, page_key)
cross join lateral (select r.page_key) p
on conflict (role, page_key) do nothing;

-- 5. add_role() becomes owner-only ---------------------------------------------
create or replace function public.add_role(
  p_key         text,
  p_label       text,
  p_description text default null,
  p_color       text default '#5A6670',
  p_bg          text default '#EEF0F2'
)
returns public.roles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := lower(regexp_replace(trim(p_key), '[^a-zA-Z0-9_]+', '_', 'g'));
  v_row public.roles;
begin
  if not public.app_is_owner() then
    raise exception 'Only the owner can add a role';
  end if;
  if v_key is null or v_key = '' then
    raise exception 'Role key is required';
  end if;

  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'user_role' and e.enumlabel = v_key
  ) then
    execute format('alter type public.user_role add value %L', v_key);
  end if;

  insert into public.roles (key, label, description, color, bg, sort, is_system)
  values (v_key, coalesce(nullif(trim(p_label), ''), initcap(v_key)),
          nullif(trim(p_description), ''), coalesce(p_color, '#5A6670'),
          coalesce(p_bg, '#EEF0F2'),
          (select coalesce(max(sort), 0) + 10 from public.roles), false)
  on conflict (key) do update
    set label = excluded.label,
        description = excluded.description,
        color = excluded.color,
        bg = excluded.bg
  returning * into v_row;

  return v_row;
end;
$$;
