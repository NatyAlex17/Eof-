# MANA Operations Platform — Task Breakdown

Two full-stack developers. Tasks are ordered roughly by dependency (top ones unblock the ones below), no dates attached. Everything already delivered (UI, schema v2, auth, DB types, data hooks, ADR, Vercel deploy) is excluded.

**Dev A — Operations Spine** · **Dev B — Data & Integrations**

---

## Dev A — Operations Spine

### Foundations

- [ ] **Profile context** — Nav shows the real logged-in user (name, role, initials); viewer role hides the admin nav item.

### Inventory & Allocation

- [ ] **Inventory on DB** — lots / boxes / contents read from real tables; CSV import confirm and manual add-lot write to the database instead of local state.
- [ ] **Allocation board on DB** — orders and per-species fulfillment come from the DB views; click and drag assignment writes real rows.
- [ ] **Realtime board** — two users see each other's assignments without refreshing.
- [ ] **Split / merge on DB** — persist through the data-layer mutations; locked fish cannot be edited.
- [ ] **Availability strip** — live available / allocated / incoming totals per species on the board.

### Lock Pipeline

- [ ] **Lock / unlock live** — the Lock button calls the `lock_board` RPC; the board freezes for every user; unlock reverses it.
- [ ] **Pick slips from DB** — slips render from real locked allocations, species-grouped with partial flags.
- [ ] **Slip PDF + auto-email** — render each slip to PDF, store in Supabase Storage, email the warehouse automatically on lock.

### Visibility

- [ ] **Notifications live** — real bell with a realtime badge; shortage detection creates alerts automatically.
- [ ] **Operations dashboard live** — KPIs from real queries; the date filter actually drives them.
- [ ] **Finance + CEO dashboards live** — real aggregates; comparison periods show real deltas.

### Credits

- [ ] **Credits & downgrades on DB** — claims auto-link to vendor / lot / box; counter amounts persist; approving a claim triggers the QBO credit memo.

### Quality

- [ ] **RLS audit** — verify all six roles can see and write only what they should.
- [ ] **Error / empty / loading sweep** — no blank panels anywhere; print CSS re-checked on slips and statements.
- [ ] **Migration parity checks** — automated report comparing the migrated data against the Google Sheets; Blake signs off before cutover.

---

## Dev B — Data & Integrations

### Foundations

- [ ] **QBO application** — submit for production keys immediately (3–5 day external approval); build against the sandbox meanwhile.
- [ ] **Google Cloud setup** — OAuth consent screen, Gmail API enabled, credentials stored.

### Orders & Customers

- [ ] **Customers CRUD** — customers, price overrides, and standing orders on real tables.
- [ ] **Order intake writes** — creates real orders with species lines; the new-customer path inserts a customer record; pricing comes from the DB, not constants.

### Vendor Import

- [ ] **Vendor mappings admin** — column mappings and the species-code dictionary editable in Admin, driving the import.
- [ ] **Server-side import** — upload → parse with the vendor's mapping → preview → atomic commit; Excel support; original file kept in Storage.
- [ ] **Incoming lots / purchase orders** — pre-sell against fish that is still in the air.

### Finance & QBO

- [ ] **Invoices on lock** — a pending invoice per locked order lands in the Finance Queue.
- [ ] **QBO push** — OAuth connect, idempotent invoice creation, success / failure states shown on the queue cards.
- [ ] **Retry worker** — background cron retries failed QBO syncs automatically.
- [ ] **QBO production swap** — switch sandbox to production keys behind a feature flag; no live invoices until cutover.

### Vendor Reconciliation

- [ ] **Statement builder** — sold lines plus credits and downgrades compute the net due from real data.
- [ ] **Recon lifecycle persisted** — Draft → Sent → Countered → Settled stored in the DB; settled statements are immutable.
- [ ] **Email statement + capture reply** — send via Gmail; a poller attaches vendor replies to the statement.

### Quality

- [ ] **Performance pass** — board stays responsive with 1,000+ content rows; add indexes and pagination where needed.
- [ ] **Migration scripts** — Google Sheets → database, idempotent with a rollback script per entity.

---

## Shared

- [ ] **End-to-end QA matrix** — full lifecycle test including splits, mixed boxes, shortages, unlock/relock, failed syncs, and two concurrent users.
- [ ] **Sheet export + mapping doc** — inventory every live Google Sheet and document column-to-table mapping before writing migration scripts.
- [ ] **Pilot run** — operate the platform in parallel with the Google Sheets for one real cycle; train Blanca and Sid.
- [ ] **Cutover** — Blake approves, QBO goes live, sheets frozen read-only, hypercare period follows.

---

**The one external clock:** the QBO application approval — submit it first; everything else is within the team's control.
