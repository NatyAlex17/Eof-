-- =============================================================================
-- MANA — Functions & triggers
--   app_role()            -> current user's role (used by RLS, recursion-safe)
--   handle_new_user()     -> auto-create a profile on signup (1st user = admin)
--   guard_profile_changes -> block self role/status escalation
--   lock_board()          -> the atomic "Lock Allocation" transaction
--   unlock_board()        -> reverse a lock
-- =============================================================================

-- Role lookup. SECURITY DEFINER so it bypasses RLS on profiles -> no recursion
-- when called from inside a profiles policy.
create or replace function public.app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- Auto-provision a profile when an auth user is created.
-- The very first user to sign up becomes 'admin' (bootstraps the owner).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  if (select count(*) from public.profiles) = 0 then
    v_role := 'admin';
  else
    v_role := 'viewer';
  end if;

  insert into public.profiles (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    v_role,
    'active'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Prevent a non-admin from changing their own role or status.
-- (Service role / postgres has auth.uid() = null -> guard is skipped.)
-- -----------------------------------------------------------------------------
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() <> 'admin' then
    if new.role <> old.role or new.status <> old.status then
      raise exception 'Only an admin can change role or status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profiles on public.profiles;
create trigger guard_profiles
  before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- =============================================================================
-- lock_board(location)
-- Atomically: lock every assigned box, mark its order locked, generate a pick
-- slip per order, flip touched lots to 'allocated', snapshot + audit.
-- All-or-nothing: any error rolls the whole thing back.
-- =============================================================================
create or replace function public.lock_board(p_location text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := auth.uid();
  v_role     public.user_role;
  v_initials text;
  v_lock_id  uuid;
  v_rec      record;
  v_orders   int := 0;
  v_boxes    int := 0;
  v_total    numeric := 0;
begin
  select role, upper(left(coalesce(nullif(trim(name), ''), '??'), 2))
    into v_role, v_initials
  from public.profiles
  where id = v_actor;

  if v_actor is null or v_role is null then
    raise exception 'Not authenticated';
  end if;

  if v_role not in ('admin', 'operations') then
    raise exception 'Only operations or admin may lock the board (role: %)', v_role;
  end if;

  if exists (select 1 from public.board_locks where location = p_location and active) then
    raise exception 'Board for % is already locked', p_location;
  end if;

  insert into public.board_locks (location, locked_by, active, snapshot)
  values (p_location, v_actor, true, '{}'::jsonb)
  returning id into v_lock_id;

  for v_rec in
    select o.id, o.code
    from public.orders o
    where o.location = p_location
      and o.status not in ('locked', 'shipped', 'invoiced')
      and exists (select 1 from public.boxes b where b.assigned_order_id = o.id)
  loop
    update public.boxes
       set locked = true, lock_initial = v_initials, status = 'allocated'
     where assigned_order_id = v_rec.id and not locked;

    update public.orders set status = 'locked' where id = v_rec.id;

    insert into public.pick_slips (order_id, slip_no, box_refs)
    select v_rec.id,
           'PS-' || v_rec.code,
           coalesce(
             jsonb_agg(
               jsonb_build_object('label', b.label, 'weight', b.weight, 'species', b.species)
               order by b.idx
             ),
             '[]'::jsonb
           )
    from public.boxes b
    where b.assigned_order_id = v_rec.id;
  end loop;

  update public.lots l
     set status = 'allocated'
   where l.status in ('received', 'available')
     and exists (
       select 1 from public.boxes b
       where b.lot_id = l.id and b.locked and b.status = 'allocated'
     );

  select count(distinct o.id), count(b.id), coalesce(sum(b.weight), 0)
    into v_orders, v_boxes, v_total
  from public.orders o
  join public.boxes b on b.assigned_order_id = o.id
  where o.location = p_location and o.status = 'locked';

  update public.board_locks
     set snapshot = jsonb_build_object(
       'orders', v_orders, 'boxes', v_boxes,
       'totalWeight', v_total, 'lockedBy', v_initials)
   where id = v_lock_id;

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (v_actor, 'lock_board', 'board_lock', v_lock_id::text,
          jsonb_build_object('location', p_location, 'orders', v_orders,
                             'boxes', v_boxes, 'totalWeight', v_total));

  return jsonb_build_object(
    'lockId', v_lock_id, 'location', p_location,
    'orders', v_orders, 'boxes', v_boxes, 'totalWeight', v_total,
    'lockedBy', v_initials, 'lockedAt', now()
  );
end;
$$;

-- =============================================================================
-- unlock_board(location) — reverse the most recent active lock.
-- =============================================================================
create or replace function public.unlock_board(p_location text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := auth.uid();
  v_role    public.user_role;
  v_lock_id uuid;
begin
  select role into v_role from public.profiles where id = v_actor;

  if v_actor is null or v_role is null then
    raise exception 'Not authenticated';
  end if;
  if v_role not in ('admin', 'operations') then
    raise exception 'Only operations or admin may unlock the board';
  end if;

  select id into v_lock_id
  from public.board_locks
  where location = p_location and active
  order by locked_at desc
  limit 1;

  if v_lock_id is null then
    raise exception 'No active lock for %', p_location;
  end if;

  update public.boxes b
     set locked = false, lock_initial = null, status = 'available'
    from public.orders o
   where b.assigned_order_id = o.id
     and o.location = p_location
     and b.locked;

  update public.orders
     set status = 'allocated'
   where location = p_location and status = 'locked';

  delete from public.pick_slips ps
  using public.orders o
  where ps.order_id = o.id and o.location = p_location;

  update public.board_locks set active = false where id = v_lock_id;

  insert into public.audit_log (actor_id, action, entity, entity_id)
  values (v_actor, 'unlock_board', 'board_lock', v_lock_id::text);

  return jsonb_build_object('unlocked', true, 'location', p_location);
end;
$$;

grant execute on function public.lock_board(text)   to authenticated;
grant execute on function public.unlock_board(text) to authenticated;
grant execute on function public.app_role()         to authenticated;
