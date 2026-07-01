# MANA — Supabase Backend (Slice 0)

The database foundation for the MANA Operations Platform. Every table mirrors a
TypeScript interface already used by the web app, so wiring the UI to it is
mechanical, not a redesign.

## What's here

```
supabase/migrations/
  20260630090001_schema.sql     Extensions, enums, all tables, the allocation
                                view, indexes, realtime publication
  20260630090002_functions.sql  app_role(), profile auto-provisioning,
                                lock_board() / unlock_board()
  20260630090003_rls.sql        Row Level Security — read for all staff,
                                writes gated by role
  20260630090004_seed.sql       Sample data mirroring the UI mock
```

## Run it against a fresh project

### Option A — Supabase CLI (recommended)

```bash
# from the repo root
supabase init           # only if there's no supabase/config.toml yet — keep the migrations folder
supabase link --project-ref <your-project-ref>
supabase db push        # applies all migrations in order
```

### Option B — SQL Editor (no CLI)

Open the project's **SQL Editor** and run the four files **in numeric order**
(`...0001` → `...0004`), each as its own query.

> Run the set **once**. The schema/enum creates are not re-runnable, but the
> seed file is idempotent if you ever need to re-seed.

## After it runs — make yourself the admin

Profiles are created automatically on signup, and **the first user to sign up
becomes `admin`**. So:

1. Start the web app and sign up with your email (`eyoab@eromoventures.com`).
2. That first account is already `admin` — done.

To promote someone later (as admin):

```sql
update public.profiles set role = 'admin' where email = 'someone@eromoventures.com';
```

## Quick sanity checks

```sql
-- Nobu should show 81 / 90
select code, target_weight, allocated_weight, allocated_pct
from public.orders_with_allocation order by code;

-- Lock the SFO board (run as an operations/admin user via the API, not here —
-- in the SQL editor auth.uid() is null so it will correctly refuse).
select public.lock_board('SFO');
```

## Access model (RLS)

| Area                                         | Who can write                                   |
| -------------------------------------------- | ----------------------------------------------- |
| Lots, boxes, board, pick slips, downgrades   | `admin`, `operations`                           |
| Orders, customers                            | `admin`, `operations`, `sales`                  |
| Invoices, vendor statements, price overrides | `admin`, `finance`                              |
| Credit claims                                | `admin`, `finance`, `sales`                     |
| Vendors, SKUs, pricing tiers                 | `admin`                                         |
| `integration_tokens` (QBO/Gmail secrets)     | **service role only** — denied to all API users |

All authenticated staff can **read** operational data. Tighten to per-location
scoping later if needed.

## Connect the web app

Add to `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-side only, never shipped to the client
```

Then install the client libs in the web app:

```bash
npm i @supabase/supabase-js @supabase/ssr
```

## Next slices (build order)

1. **Auth** — replace the mock login (`setTimeout` → `supabase.auth.signInWithPassword`).
2. **Board live** — read `orders_with_allocation` + `boxes`; drag writes
   `boxes.assigned_order_id`; the Lock button calls `rpc('lock_board')`.
3. **Order Intake / Customers** — insert real rows; new-customer flow inserts a
   `customers` row then the `orders` row.
4. **Finance + QBO** — generate invoices from locked orders, push via QBO API.
5. **Credits + Vendor Recon** — approve/counter → QBO credit memo → statement lifecycle.
6. **Gmail + dashboards + notifications**.
