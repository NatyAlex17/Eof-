-- =============================================================================
-- MANA — Schema v2 fixes  (run ONCE against a DB that already has 0001–0005)
--
-- Fixes from the audit:
--   1. Multi-species orders        -> order_lines table
--   2. Mixed-species boxes         -> box_contents table (assignment lives here)
--   3. lots lose species/grade     -> contents carry them; add 'incoming' status
--   4. Fulfillment view per line   -> replaces orders_with_allocation
--   5. lock/unlock reworked        -> operate on contents, species-grouped slips
--   6. vendor_mappings + species-code dictionary + lb/kg
--   7. standing_orders, notification_prefs, purchase_orders
--   8. FK the loose text columns (credit_claims, downgrades, price_overrides)
--   9. audit_log actor defaults to auth.uid(); insert policy tightened
--  10. pricing multipliers reconciled to one source of truth
--  11. admin seed user gets its auth.identities row (login fix)
--
-- Data is BACKFILLED from the old columns before they are dropped.
-- =============================================================================

-- 3b. lots can be pre-sold while still in the air
alter type lot_status add value if not exists 'incoming' before 'received';

-- Old view depends on columns we are about to drop
drop view if exists public.orders_with_allocation;

-- -----------------------------------------------------------------------------
-- 1. ORDER LINES  (an order = N species, each with its own target)
-- -----------------------------------------------------------------------------
create table public.order_lines (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  species       text not null,
  grade         text,
  target_weight numeric(10,2) not null default 0,
  unit_price    numeric(10,2),
  created_at    timestamptz not null default now(),
  unique (order_id, species)
);

-- Backfill: every existing single-species order becomes one line
insert into public.order_lines (order_id, species, target_weight)
select id, species, target_weight from public.orders
where species is not null;

-- -----------------------------------------------------------------------------
-- 2. BOX CONTENTS  (a box = N species portions; assignment/split live here)
-- -----------------------------------------------------------------------------
create table public.box_contents (
  id                     uuid primary key default gen_random_uuid(),
  box_id                 uuid not null references public.boxes(id) on delete cascade,
  species                text not null,
  grade                  text,
  weight                 numeric(10,2) not null,
  assigned_order_line_id uuid references public.order_lines(id) on delete set null,
  locked                 boolean not null default false,
  lock_initial           text,
  split_group            uuid,
  part                   box_part,
  created_at             timestamptz not null default now()
);

-- Backfill: each old box becomes one content row; species falls back to the
-- lot's species; the old order assignment maps to the matching order line.
insert into public.box_contents
  (box_id, species, grade, weight, assigned_order_line_id,
   locked, lock_initial, split_group, part)
select
  b.id,
  coalesce(b.species, l.species, 'Unknown'),
  coalesce(b.grade, l.grade),
  b.weight,
  (select ol.id from public.order_lines ol
    where ol.order_id = b.assigned_order_id
      and ol.species = coalesce(b.species, l.species)
    limit 1),
  b.locked,
  b.lock_initial,
  b.split_group,
  b.part
from public.boxes b
join public.lots l on l.id = b.lot_id;

-- Strip the moved columns off boxes / lots / orders
alter table public.boxes
  drop column if exists weight,
  drop column if exists species,
  drop column if exists grade,
  drop column if exists assigned_order_id,
  drop column if exists status,
  drop column if exists locked,
  drop column if exists lock_initial,
  drop column if exists split_group,
  drop column if exists parent_label,
  drop column if exists part;

alter table public.lots
  drop column if exists species,
  drop column if exists grade;

alter table public.orders
  drop column if exists species,
  drop column if exists target_weight,
  drop column if exists tier;          -- derive via customers.tier, one truth

create index idx_contents_box   on public.box_contents(box_id);
create index idx_contents_line  on public.box_contents(assigned_order_line_id);
create index idx_contents_split on public.box_contents(split_group);

-- -----------------------------------------------------------------------------
-- 4. FULFILLMENT VIEWS  (live, per species line + order rollup)
-- -----------------------------------------------------------------------------
create view public.order_lines_with_fulfillment
with (security_invoker = true) as
select
  ol.*,
  o.code as order_code,
  o.location,
  o.status as order_status,
  c.name as customer,
  c.tier,
  coalesce((select sum(bc.weight) from public.box_contents bc
            where bc.assigned_order_line_id = ol.id), 0)::numeric(10,2) as fulfilled_weight,
  case when ol.target_weight > 0
       then round(coalesce((select sum(bc.weight) from public.box_contents bc
            where bc.assigned_order_line_id = ol.id), 0) / ol.target_weight * 100)
       else 0 end as fulfilled_pct
from public.order_lines ol
join public.orders o on o.id = ol.order_id
join public.customers c on c.id = o.customer_id;

create view public.orders_with_fulfillment
with (security_invoker = true) as
select
  o.*,
  c.name as customer,
  c.tier,
  count(ol.id) as line_count,
  count(ol.id) filter (
    where coalesce((select sum(bc.weight) from public.box_contents bc
                    where bc.assigned_order_line_id = ol.id), 0) >= ol.target_weight
  ) as lines_full,
  coalesce(sum((select sum(bc.weight) from public.box_contents bc
                where bc.assigned_order_line_id = ol.id)), 0)::numeric(10,2) as fulfilled_weight,
  coalesce(sum(ol.target_weight), 0)::numeric(10,2) as target_weight
from public.orders o
join public.customers c on c.id = o.customer_id
left join public.order_lines ol on ol.order_id = o.id
group by o.id, c.name, c.tier;

-- Live availability per species (available vs allocated), the number the
-- Google Sheets never showed
create view public.availability_by_species
with (security_invoker = true) as
select
  bc.species,
  l.location,
  sum(bc.weight) filter (where bc.assigned_order_line_id is null)::numeric(12,2) as available_lb,
  sum(bc.weight) filter (where bc.assigned_order_line_id is not null)::numeric(12,2) as allocated_lb,
  -- status compared as text: a freshly added enum value can't be referenced as an
  -- enum literal in the same transaction that ALTER TYPE'd it
  sum(bc.weight) filter (where l.status::text = 'incoming')::numeric(12,2) as incoming_lb
from public.box_contents bc
join public.boxes b on b.id = bc.box_id
join public.lots l on l.id = b.lot_id
where l.status::text in ('incoming','received','available','allocated')
group by bc.species, l.location;

-- -----------------------------------------------------------------------------
-- 6. VENDOR MAPPINGS  (column map + species-code dictionary + units)
-- -----------------------------------------------------------------------------
create table public.vendor_mappings (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid unique not null references public.vendors(id) on delete cascade,
  box_col     text not null,
  weight_col  text not null,
  species_col text not null,
  grade_col   text,
  uom         text not null default 'lb' check (uom in ('lb','kg')),
  created_at  timestamptz not null default now()
);

create table public.vendor_species_codes (
  id        uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  code      text not null,             -- what the vendor writes: 'YF', 'B'
  species   text not null,             -- what it means: 'Yellowfin Tuna'
  unique (vendor_id, code)
);

-- Seed from the (previously static) admin screen
insert into public.vendor_mappings (vendor_id, box_col, weight_col, species_col, grade_col, uom)
select id, 'box_id', 'net_wt_lbs', 'product_name', 'quality_grade', 'lb'
  from public.vendors where code = 'kona'
on conflict (vendor_id) do nothing;
insert into public.vendor_mappings (vendor_id, box_col, weight_col, species_col, grade_col, uom)
select id, 'BoxNo', 'Weight', 'Item', 'Grade', 'lb'
  from public.vendors where code = 'pacific'
on conflict (vendor_id) do nothing;
insert into public.vendor_mappings (vendor_id, box_col, weight_col, species_col, grade_col, uom)
select id, 'BOX', 'LBS', 'SPECIES', 'GRD', 'lb'
  from public.vendors where code = 'island'
on conflict (vendor_id) do nothing;

insert into public.vendor_species_codes (vendor_id, code, species)
select v.id, x.code, x.species
from public.vendors v
cross join (values
  ('YF','Yellowfin Tuna'), ('BE','Bigeye Tuna'), ('AHI','Ahi Tuna'),
  ('ONO','Ono'), ('SAL','Salmon'), ('HAM','Hamachi'), ('MAHI','Mahi-Mahi')
) as x(code, species)
on conflict (vendor_id, code) do nothing;

-- -----------------------------------------------------------------------------
-- 7. STANDING ORDERS · NOTIFICATION PREFS · PURCHASE ORDERS
-- -----------------------------------------------------------------------------
create table public.standing_orders (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  species     text not null,
  grade       text,
  quantity_lb numeric(10,2) not null,
  cadence     text not null,            -- 'Mon/Thu', 'Weekly Wed', …
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.notification_prefs (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.profiles(id) on delete cascade,
  type     notif_type not null,
  in_app   boolean not null default true,
  email    boolean not null default false,
  sms      boolean not null default false,
  unique (user_id, type)
);

-- Pre-ordered fish the team sells against before it lands (from discovery call)
create table public.purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references public.vendors(id) on delete restrict,
  po_number   text unique not null,
  species     text not null,
  expected_lb numeric(12,2) not null default 0,
  expected_at date,
  status      text not null default 'open' check (status in ('open','partial','received','closed')),
  lot_id      uuid references public.lots(id) on delete set null,  -- filled when it lands
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 8. TIGHTEN LOOSE RELATIONSHIPS
-- -----------------------------------------------------------------------------
alter table public.credit_claims
  add column if not exists lot_id uuid references public.lots(id) on delete set null,
  add column if not exists vendor_id uuid references public.vendors(id) on delete set null;
-- (free-text lot/boxes columns stay for display of multi-box refs like "9,10,11")

alter table public.downgrades
  add column if not exists box_id uuid references public.boxes(id) on delete set null,
  add column if not exists box_content_id uuid references public.box_contents(id) on delete set null;

alter table public.price_overrides
  add constraint price_overrides_sku_fkey
  foreign key (sku) references public.skus(code) on update cascade;

-- -----------------------------------------------------------------------------
-- 9. AUDIT LOG — actor can only be yourself
-- -----------------------------------------------------------------------------
alter table public.audit_log alter column actor_id set default auth.uid();
drop policy if exists "audit_insert" on public.audit_log;
create policy "audit_insert" on public.audit_log
  for insert to authenticated
  with check (actor_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 10. ONE TRUTH FOR PRICING MULTIPLIERS
--     (T1 premium buys below base, T3 COD pays a premium — per order-intake)
-- -----------------------------------------------------------------------------
update public.pricing_tiers set base_multiplier = 0.950 where tier = 'T1';
update public.pricing_tiers set base_multiplier = 1.000 where tier = 'T2';
update public.pricing_tiers set base_multiplier = 1.080 where tier = 'T3';

-- -----------------------------------------------------------------------------
-- 11. ADMIN SEED LOGIN FIX — auth.identities row (newer GoTrue requires it)
-- -----------------------------------------------------------------------------
insert into auth.identities (id, user_id, provider_id, provider, identity_data,
                             last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.email = 'admin@example.com'
  and not exists (select 1 from auth.identities i where i.user_id = u.id);

-- -----------------------------------------------------------------------------
-- RLS for the new tables (same convention: staff read, role-gated write)
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on
  public.order_lines, public.box_contents, public.vendor_mappings,
  public.vendor_species_codes, public.standing_orders,
  public.notification_prefs, public.purchase_orders
to authenticated;

alter table public.order_lines enable row level security;
create policy "order_lines_read"  on public.order_lines for select to authenticated using (true);
create policy "order_lines_write" on public.order_lines for all to authenticated
  using (public.app_role() in ('admin','operations','sales'))
  with check (public.app_role() in ('admin','operations','sales'));

alter table public.box_contents enable row level security;
create policy "box_contents_read"  on public.box_contents for select to authenticated using (true);
create policy "box_contents_write" on public.box_contents for all to authenticated
  using (public.app_role() in ('admin','operations'))
  with check (public.app_role() in ('admin','operations'));

alter table public.vendor_mappings enable row level security;
create policy "vendor_mappings_read"  on public.vendor_mappings for select to authenticated using (true);
create policy "vendor_mappings_write" on public.vendor_mappings for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

alter table public.vendor_species_codes enable row level security;
create policy "vendor_species_codes_read"  on public.vendor_species_codes for select to authenticated using (true);
create policy "vendor_species_codes_write" on public.vendor_species_codes for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

alter table public.standing_orders enable row level security;
create policy "standing_orders_read"  on public.standing_orders for select to authenticated using (true);
create policy "standing_orders_write" on public.standing_orders for all to authenticated
  using (public.app_role() in ('admin','operations','sales'))
  with check (public.app_role() in ('admin','operations','sales'));

alter table public.notification_prefs enable row level security;
create policy "notification_prefs_own" on public.notification_prefs
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.purchase_orders enable row level security;
create policy "purchase_orders_read"  on public.purchase_orders for select to authenticated using (true);
create policy "purchase_orders_write" on public.purchase_orders for all to authenticated
  using (public.app_role() in ('admin','operations'))
  with check (public.app_role() in ('admin','operations'));

-- -----------------------------------------------------------------------------
-- REALTIME for the new live tables
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.box_contents, public.order_lines;
  end if;
exception when duplicate_object then null;
end $$;

-- =============================================================================
-- 5. LOCK / UNLOCK v2 — operate on contents, slips grouped by species
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
  v_pieces   int := 0;
  v_total    numeric := 0;
begin
  select role, upper(left(coalesce(nullif(trim(name), ''), '??'), 2))
    into v_role, v_initials
  from public.profiles where id = v_actor;

  if v_actor is null or v_role is null then
    raise exception 'Not authenticated';
  end if;
  if v_role not in ('admin','operations') then
    raise exception 'Only operations or admin may lock the board (role: %)', v_role;
  end if;
  if exists (select 1 from public.board_locks where location = p_location and active) then
    raise exception 'Board for % is already locked', p_location;
  end if;

  insert into public.board_locks (location, locked_by, active, snapshot)
  values (p_location, v_actor, true, '{}'::jsonb)
  returning id into v_lock_id;

  for v_rec in
    select distinct o.id, o.code
    from public.orders o
    join public.order_lines ol on ol.order_id = o.id
    where o.location = p_location
      and o.status not in ('locked','shipped','invoiced')
      and exists (select 1 from public.box_contents bc
                  where bc.assigned_order_line_id = ol.id)
  loop
    -- lock every content portion assigned to any line of this order
    update public.box_contents bc
       set locked = true, lock_initial = v_initials
      from public.order_lines ol
     where bc.assigned_order_line_id = ol.id
       and ol.order_id = v_rec.id
       and not bc.locked;

    update public.orders set status = 'locked' where id = v_rec.id;

    -- pick slip: species-grouped lines; PARTIAL when the box holds anything
    -- besides this portion (mixed box or split)
    insert into public.pick_slips (order_id, slip_no, box_refs)
    select v_rec.id,
           'PS-' || v_rec.code,
           coalesce(jsonb_agg(jsonb_build_object(
             'box',     b.label,
             'species', bc.species,
             'grade',   bc.grade,
             'weight',  bc.weight,
             'lot',     l.lot_code,
             'partial', (bc.split_group is not null
                         or exists (select 1 from public.box_contents s
                                    where s.box_id = bc.box_id and s.id <> bc.id))
           ) order by bc.species, b.idx), '[]'::jsonb)
    from public.box_contents bc
    join public.boxes b on b.id = bc.box_id
    join public.lots  l on l.id = b.lot_id
    join public.order_lines ol on ol.id = bc.assigned_order_line_id
    where ol.order_id = v_rec.id;
  end loop;

  update public.lots l
     set status = 'allocated'
   where l.status in ('received','available')
     and exists (select 1 from public.box_contents bc
                 join public.boxes b on b.id = bc.box_id
                 where b.lot_id = l.id and bc.locked);

  select count(distinct ol.order_id), count(bc.id), coalesce(sum(bc.weight), 0)
    into v_orders, v_pieces, v_total
  from public.box_contents bc
  join public.order_lines ol on ol.id = bc.assigned_order_line_id
  join public.orders o on o.id = ol.order_id
  where o.location = p_location and o.status = 'locked';

  update public.board_locks
     set snapshot = jsonb_build_object('orders', v_orders, 'pieces', v_pieces,
                                       'totalWeight', v_total, 'lockedBy', v_initials)
   where id = v_lock_id;

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (v_actor, 'lock_board', 'board_lock', v_lock_id::text,
          jsonb_build_object('location', p_location, 'orders', v_orders,
                             'pieces', v_pieces, 'totalWeight', v_total));

  return jsonb_build_object('lockId', v_lock_id, 'location', p_location,
                            'orders', v_orders, 'pieces', v_pieces,
                            'totalWeight', v_total, 'lockedBy', v_initials,
                            'lockedAt', now());
end;
$$;

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
  if v_role not in ('admin','operations') then
    raise exception 'Only operations or admin may unlock the board';
  end if;

  select id into v_lock_id from public.board_locks
  where location = p_location and active
  order by locked_at desc limit 1;

  if v_lock_id is null then
    raise exception 'No active lock for %', p_location;
  end if;

  update public.box_contents bc
     set locked = false, lock_initial = null
    from public.order_lines ol, public.orders o
   where bc.assigned_order_line_id = ol.id
     and ol.order_id = o.id
     and o.location = p_location
     and bc.locked;

  update public.orders set status = 'allocated'
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
