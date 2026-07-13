# ADR-001 — Backend architecture: where server logic lives

**Status:** Accepted · July 2026
**Deciders:** Dev A, Dev B (Week 1 pairing)

## Context

The repo has two apps: `apps/web` (Next.js 16, all UI) and `apps/api` (NestJS starter,
currently empty). The database is Supabase Postgres with RLS, accessed via
`@supabase/supabase-js` (no ORM). We need a rule for where each kind of server
logic goes so the two developers don't build the same thing in two places.

## Decision

| Kind of logic                                                                        | Lives in                                                  | Auth model                                         |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------- | -------------------------------------------------- |
| User-facing reads/writes (pages, forms, board)                                       | `apps/web` — Supabase client directly via `src/lib/data/` | User session (anon key) + RLS                      |
| Privileged single-shot actions (invite user, QBO connect, send email, import commit) | `apps/web` — Next.js route handlers under `src/app/api/`  | Verify session first, then service-role client     |
| Multi-table atomic operations (lock board, split RPC, import_lot)                    | Postgres functions (RPC) in `supabase/migrations`         | SECURITY DEFINER + role check inside the function  |
| Background / long-running jobs (QBO retry worker, Gmail poller, statement scheduler) | `apps/api` (NestJS)                                       | Service-role key + `DATABASE_URL`; no user session |

Rules that follow:

1. **The UI never talks to Postgres except through `src/lib/data/`** (queries.ts,
   mutations.ts, realtime.ts). One import point, fully typed by the generated
   `database.types.ts`.
2. **Anything that must be all-or-nothing is a Postgres function**, not client-side
   sequencing (lock_board and unlock_board already are; import_lot and
   split_content should follow when server-side).
3. **`apps/api` never serves user requests.** It is a worker: cron retries,
   inbox polling, scheduled statement generation. If it ever needs to expose an
   endpoint, that endpoint is called by `apps/web` route handlers — not by the
   browser.
4. **Secrets** (QBO/Gmail tokens) live in `integration_tokens`, which RLS denies
   to every API role — only service-role code (route handlers and apps/api) can
   read them.
5. **Regenerate `database.types.ts` after every migration** and commit it with
   the migration in the same PR:
   `npx supabase gen types typescript --project-id <ref> | Out-File -Encoding utf8 apps/web/src/lib/database.types.ts`
   (PowerShell `>` writes UTF-16 and breaks the build — use `Out-File -Encoding utf8`.)

## Consequences

- No ORM (Prisma/Drizzle) for now: the Supabase client + generated types cover
  typing, and RLS is enforced end-to-end. Revisit only if `apps/api` grows
  complex query logic; if so, prefer Drizzle against `DATABASE_URL` inside
  `apps/api` only — the web app keeps the Supabase client regardless.
- Adding a table = migration + regen types + (if UI-facing) a query/mutation in
  `src/lib/data/`. Three small steps, same PR.
- The empty NestJS starter stays dormant until Week 4 (QBO retry worker is its
  first real job). Don't build controllers before then.

---

## Addendum (July) — external roles, RLS isolation, generated documents

Decisions taken while building the customer + vendor portals:

- **Roles are data, not just an enum.** A `roles` table backs the UI (labels/colours/
  descriptions) and an admin-only `add_role()` RPC extends the `user_role` enum so custom
  roles are assignable. `customer` and `vendor` were added as external roles.
- **External-role isolation via SECURITY DEFINER helpers.** `app_customer_id()`,
  `app_vendor_id()`, `app_vendor_verified()` mirror `app_role()` and are used inside RLS
  policies to scope external users to their own rows without recursion. A freshly-added enum
  value can't be used as an enum literal in the same transaction, so policy checks compare
  `app_role()::text`.
- **Deny-by-default for external roles.** Every broad `using(true)` read policy (including the
  schema-v3 finance tables) was rewritten so `customer`/`vendor` are excluded and granted only
  their own scoped rows. New internal tables MUST follow this — never ship `using(true)`.
- **Vendor packing lists are structured form entry, not parsing.** Vendor PDFs aren't
  standardized, so verified vendors key lines into a form → `documents.parsed_payload`
  (no file; `storage_path` made nullable). Staff review then create the shipment.
- **System-generated documents.** Commercial invoice / packing list is generated from the
  vendor's structured data as a print-to-PDF page (`/mana/documents/[id]/invoice`) — no
  server PDF service; the browser's print is the PDF export.
- **Private storage per vendor.** `vendor-docs` bucket; storage RLS confines a vendor to its
  own `{vendor_id}/…` folder; staff read all.
