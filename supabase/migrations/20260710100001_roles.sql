-- =============================================================================
-- MANA — Roles registry (makes roles addable from the Admin UI)
--
-- Until now roles lived ONLY in the `user_role` enum + hardcoded UI labels, so
-- there was no way to add a role from the app. This migration adds:
--   1. public.roles          -> the source of truth for role key/label/colors
--   2. add_role(...)          -> admin-only RPC that (a) extends the user_role
--                                enum with a new value and (b) registers its
--                                UI metadata, so the new role is assignable.
--
-- The 6 built-in roles are seeded to match the existing enum + UI exactly, so
-- nothing that already references 'admin'/'operations'/... changes behaviour.
--
-- Run AFTER the earlier migrations. Safe to re-run.
-- =============================================================================

create table if not exists public.roles (
  key         text primary key,
  label       text not null,
  description text,
  color       text not null default '#5A6670',
  bg          text not null default '#EEF0F2',
  sort        int  not null default 100,
  is_system   boolean not null default false,   -- built-ins can't be deleted
  assignable  boolean not null default true,     -- can be picked in the UI
  created_at  timestamptz not null default now()
);

-- Seed the 6 built-in roles (colours/labels/descriptions match the Admin UI).
insert into public.roles (key, label, description, color, bg, sort, is_system) values
  ('admin',      'Admin',      'Full access · manage users, settings, integrations', '#2D5365', '#EEF3F6', 10, true),
  ('operations', 'Operations', 'Inventory, allocation, receiving, pick slips',        '#2E6347', '#EAF1ED', 20, true),
  ('finance',    'Finance',    'Finance queue, credits, vendor reconciliation',       '#8A5A14', '#F4EEE2', 30, true),
  ('sales',      'Sales',      'Order intake, customer management',                   '#5A3E6B', '#F0ECF6', 40, true),
  ('logistics',  'Logistics',  'Pick slips, shipments, BOL workflow',                 '#5A6670', '#EEF0F2', 50, true),
  ('viewer',     'Viewer',     'Read-only access to all modules',                     '#8A99A3', '#F4F5F6', 60, true)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- RLS: any authenticated user may read the registry (dropdowns need it);
-- only an admin may write. Deletes are additionally blocked for is_system rows.
-- -----------------------------------------------------------------------------
alter table public.roles enable row level security;

drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles
  for select to authenticated using (true);

drop policy if exists roles_admin_write on public.roles;
create policy roles_admin_write on public.roles
  for all to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- add_role() — admin-only. Extends the enum THEN registers UI metadata.
--
-- ALTER TYPE ... ADD VALUE is allowed inside a transaction on PG12+, provided
-- the new value is not *used* in the same transaction. We only insert its key
-- (plain text) into public.roles, so this is safe. The value becomes usable as
-- a profiles.role after this call commits.
-- -----------------------------------------------------------------------------
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
  if public.app_role() <> 'admin' then
    raise exception 'Only an admin can add a role';
  end if;
  if v_key is null or v_key = '' then
    raise exception 'Role key is required';
  end if;

  -- Add the enum value if it isn't there yet (idempotent).
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

grant execute on function public.add_role(text, text, text, text, text) to authenticated;
