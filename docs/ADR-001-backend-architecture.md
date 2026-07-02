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
