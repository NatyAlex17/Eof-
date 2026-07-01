-- =============================================================================
-- MANA Operations Platform — Schema (slice 0)
-- Grounded in the TypeScript interfaces already used by the web app.
-- Run order: 1) this file  2) functions  3) rls  4) seed
-- Money & weights use NUMERIC (never float). Status fields use Postgres enums.
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- ENUMS  (mirror the union types in the UI)
-- -----------------------------------------------------------------------------
create type user_role        as enum ('admin','operations','finance','sales','logistics','viewer');
create type user_status      as enum ('active','invited','inactive');
create type customer_tier    as enum ('T1','T2','T3');
create type customer_status  as enum ('active','inactive');
create type lot_status       as enum ('received','available','allocated','shipped');
create type box_part         as enum ('A','B');
create type order_status     as enum ('open','allocated','locked','shipped','invoiced');
create type invoice_status   as enum ('pending','failed','synced');
create type claim_status     as enum ('open','approved','countered','rejected');
create type downgrade_status as enum ('pending','applied','disputed');
create type statement_status as enum ('draft','sent','countered','settled');
create type notif_type       as enum ('shortage','sync','approval','credit','receiving','shipment');
create type parse_status     as enum ('pending','parsed','needs_review','posted');
create type integration_provider as enum ('qbo','gmail');

-- -----------------------------------------------------------------------------
-- PROFILES  (extends auth.users — role-based access lives here)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  email      text not null,
  role       user_role   not null default 'viewer',
  location   text,
  status     user_status not null default 'invited',
  last_seen  timestamptz,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- REFERENCE DATA
-- -----------------------------------------------------------------------------
create table public.vendors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  code          text unique not null,
  terms         text,
  contact_email text,
  created_at    timestamptz not null default now()
);

create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  name            text unique not null,
  contact         text,
  phone           text,
  email           text,
  tier            customer_tier   not null default 'T2',
  default_carrier text,
  terms           text,
  location        text,
  standing_order  text,
  channel_pref    text,
  status          customer_status not null default 'active',
  qbo_customer_id text,
  created_at      timestamptz not null default now()
);

create table public.price_overrides (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  sku            text not null,
  species        text,
  price          numeric(10,2) not null,
  effective_from date,
  created_at     timestamptz not null default now(),
  unique (customer_id, sku)
);

create table public.skus (
  code       text primary key,
  species    text not null,
  grade      text,
  pack_type  text,
  uom        text,
  qbo_item   text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.pricing_tiers (
  tier            text primary key,
  label           text not null,
  terms           text,
  base_multiplier numeric(6,3) not null default 1.0,
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- CORE OPERATIONS:  lots -> boxes,  customers -> orders,  boxes -> orders
-- -----------------------------------------------------------------------------
create table public.lots (
  id          uuid primary key default gen_random_uuid(),
  lot_code    text unique not null,
  vendor_id   uuid references public.vendors(id) on delete set null,
  species     text not null,
  grade       text,
  status      lot_status not null default 'received',
  received_at timestamptz,
  location    text,
  created_at  timestamptz not null default now()
);

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete restrict,
  code          text unique not null,
  tier          text,
  carrier       text,
  species       text not null,
  target_weight numeric(10,2) not null default 0,   -- the "90" in 81/90
  ship_date     date,
  location      text,
  status        order_status not null default 'open',
  color         text,                                -- board swimlane color
  created_at    timestamptz not null default now()
  -- NOTE: allocated_weight is DERIVED — see view orders_with_allocation below
);

create table public.boxes (
  id                uuid primary key default gen_random_uuid(),
  lot_id            uuid not null references public.lots(id) on delete cascade,
  label             text not null,                   -- "B-4471"
  idx               int,
  weight            numeric(10,2) not null,
  species           text,
  grade             text,
  assigned_order_id uuid references public.orders(id) on delete set null,
  status            text not null default 'available',
  locked            boolean not null default false,
  lock_initial      text,
  -- split-box lineage (matches Box.splitGroup / parentN / part in the UI)
  split_group       uuid,
  parent_label      text,
  part              box_part,
  created_at        timestamptz not null default now(),
  unique (lot_id, label)
);

create table public.board_locks (
  id        uuid primary key default gen_random_uuid(),
  location  text not null,
  locked_by uuid references public.profiles(id),
  locked_at timestamptz not null default now(),
  snapshot  jsonb,
  active    boolean not null default true
);

create table public.pick_slips (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  slip_no      text not null,
  generated_at timestamptz not null default now(),
  box_refs     jsonb,
  pdf_url      text
);

-- -----------------------------------------------------------------------------
-- FINANCE
-- -----------------------------------------------------------------------------
create table public.invoices (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_no  text unique not null,
  amount      numeric(12,2) not null default 0,
  terms       text,
  status      invoice_status not null default 'pending',
  qbo_ref     text,
  err_msg     text,
  synced_at   timestamptz,
  created_at  timestamptz not null default now()
);

create table public.credit_claims (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references public.customers(id) on delete set null,
  order_id       uuid references public.orders(id) on delete set null,
  lot            text,
  boxes          text,
  species        text,
  reason         text,
  claimed_by     text,
  amount         numeric(12,2) not null default 0,
  counter_amount numeric(12,2),                       -- the counter-offer field
  status         claim_status not null default 'open',
  qbo_ref        text,
  resolved_note  text,
  sales_rep      text,
  created_at     timestamptz not null default now()
);

create table public.downgrades (
  id         uuid primary key default gen_random_uuid(),
  lot_id     uuid references public.lots(id) on delete set null,
  box        text,
  species    text,
  from_grade text,
  to_grade   text,
  reason     text,
  vendor_id  uuid references public.vendors(id) on delete set null,
  weight_lb  numeric(10,2),
  impact     numeric(12,2),
  status     downgrade_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.vendor_statements (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references public.vendors(id) on delete cascade,
  period     text,
  net_due    numeric(12,2) not null default 0,
  status     statement_status not null default 'draft',  -- draft->sent->countered->settled
  sent_at    timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.statement_lines (
  id           uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.vendor_statements(id) on delete cascade,
  type         text,
  description  text,
  amount       numeric(12,2) not null default 0
);

-- -----------------------------------------------------------------------------
-- SYSTEM / INTEGRATIONS
-- -----------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  type       notif_type not null,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.vendor_emails (
  id              uuid primary key default gen_random_uuid(),
  vendor_id       uuid references public.vendors(id) on delete set null,
  gmail_message_id text unique,
  subject         text,
  received_at     timestamptz,
  parse_status    parse_status not null default 'pending',
  raw_body        text,
  attachment_urls jsonb,
  created_at      timestamptz not null default now()
);

-- Secrets — RLS denies all; only the service role (server) ever touches this.
create table public.integration_tokens (
  id            uuid primary key default gen_random_uuid(),
  provider      integration_provider not null,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  realm_id      text,
  updated_at    timestamptz not null default now()
);

create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  text,
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- DERIVED VIEW:  live allocated weight per order  (the 81 in "81 / 90")
-- security_invoker => underlying RLS applies as the querying user.
-- -----------------------------------------------------------------------------
create view public.orders_with_allocation
with (security_invoker = true) as
select
  o.*,
  coalesce((select sum(b.weight) from public.boxes b
            where b.assigned_order_id = o.id), 0)::numeric(10,2) as allocated_weight,
  case when o.target_weight > 0
       then round(coalesce((select sum(b.weight) from public.boxes b
            where b.assigned_order_id = o.id), 0) / o.target_weight * 100)
       else 0 end as allocated_pct
from public.orders o;

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
create index idx_boxes_order   on public.boxes(assigned_order_id);
create index idx_boxes_lot     on public.boxes(lot_id);
create index idx_boxes_split   on public.boxes(split_group);
create index idx_orders_loc    on public.orders(location, status);
create index idx_orders_cust   on public.orders(customer_id);
create index idx_invoices_stat on public.invoices(status);
create index idx_invoices_ord  on public.invoices(order_id);
create index idx_claims_stat   on public.credit_claims(status);
create index idx_notif_user    on public.notifications(user_id, read);
create index idx_vemails_vend  on public.vendor_emails(vendor_id, parse_status);

-- -----------------------------------------------------------------------------
-- REALTIME:  let the board, finance counters & notifications stream live
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime
      add table public.boxes, public.orders, public.invoices,
                public.notifications, public.board_locks;
  end if;
exception when duplicate_object then null;
end $$;
