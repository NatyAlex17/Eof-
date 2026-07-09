# MANA Operations Platform — Master Task List

**Supersedes `MANA_Task_Breakdown.md`.** This is the single authoritative list. It folds together
the original build plan, the finance-coordinator system analysis, and the items adopted from the
consolidated developer/handover document.

**Legend** ✅ done · 🔨 previously planned · 🆕 new (finance analysis or handover doc) · 🌐 external portal (vendor/customer) · ⚡ decision/blocker
**Owners** — **A** = Operations Spine · **B** = Data & Integrations · **Both**

Two full-stack developers, working in parallel. Phases are dependency-ordered; within a phase, A and B run concurrently.

---

## Decisions to lock first (⚡ block downstream work)

- [ ] ⚡🆕 **QBO outbound mapping** — QBO has **no SalesOrder entity**. Decide what a committed customer order posts to: **Invoice / Estimate / SalesReceipt**. Blocks all QBO outbound work. — Both + finance
- [ ] ⚡🆕 **EOF vs Mana** — two QBO companies (two realms/OAuth) or one company with Class/Location tracking? Gates every QBO table and sync. — Both + finance
- [ ] ⚡🆕 **Durable jobs engine** — adopt **Inngest** for QBO/Gmail sync & retries, or keep the NestJS-worker + cron plan? (Inngest recommended by the handover doc.) — B
- [ ] ⚡ **Confirm auth stays Supabase Auth** (handover doc suggested Clerk; ours is built — keep unless multi-org need). — Both
- [ ] ⚡ **Inventory truth** — our system is the ledger (QBO items non-inventory + monthly JE) vs keep QBO inventory. Changes current behavior; accountant sign-off. — B + finance
- [ ] ⚡ **Get real sample files** — vendor commercial invoice, packing list, the PO Excel from the current paid tool (2–3 each). Parsers build against real files. — Both
- [ ] ⚡ **Confirm variance tolerances** — ~1 lb / 2% weight, ~$0.05 / 2% rate. — B + finance
- [ ] ⚡🆕 **Fresho API / email tap** — investigate whether TFK's PO emails can flow directly into MANA (Fresho API, or tap the shared inbox). TFK is ~50–60% of order volume. — B
- [ ] ⚡🆕 **Approve the two external roles** — vendor + customer portals (see Phase 8). Confirmed "not yet scoped" by Erdolo; needs written sign-off before building. — Both + Blake

---

## Corrections from client recaps (July) — fix these assumptions

These override earlier assumptions baked into the plan:

- **Google Sheets = exactly two**, and one is **not ours**: **Main Freight** (daily allocation, one tab per day, **owned by the 3PL** — we can add rows but cannot delete/modify protected records; they archive completed tabs) and **Essential SFO / Sentra** (SF, direct shipments). → Migration treats Main Freight as **integrate-with, not replace**; only the Sentra/internal sheets are ours to freeze. Update Phase 7.
- **Fresho is a one-customer band-aid** for **True Foods Kitchen (TFK)** — ~46 locations, twice-weekly standing orders, simple loins, ~50–60% of order volume. Fresho stays TFK's source of truth in the interim; its value is the auto-confirmation loop. The other ~50% is manual phone/text/email.
- **"Customer/EOF" delivery indicator** = customer-pickup vs company-delivery per shipment — add as a first-class flag (not just `freight_mode`).
- **Tahiti is the settlement exception, not the template.** Most vendors issue credit notes **directly**; only Tahiti does the **monthly manual settlement**, with a strict order: **customer downgrade prices entered first → Blake sets final vendor price → report shared with Tahiti.**
- **TFK is one customer with 46 sub-locations** — standing-orders must fan out to locations.
- **Reconciliation reports are backlogged** — support importing/backdating historical downgrades & settlements, not just forward-run.

---

## Phase 0 — Foundations

- [x] ✅ Supabase project + schema v1 (lots, boxes, orders, customers, invoices, RLS, lock RPCs, seed)
- [x] ✅ Schema v2 fixes applied (order_lines, box_contents, vendor_mappings + species codes, standing_orders, purchase_orders, fulfillment/availability views)
- [x] ✅ Auth: real login/logout, `/mana/*` middleware guard, 6 roles, admin invite, first-signup=admin
- [x] ✅ Generated DB types + typed data layer (`lib/data`) + ADR-001
- [x] ✅ Vercel deploy
- [x] ✅ Admin SKU catalog + per-species-per-tier pricing (live on DB)
- [ ] ⚡ Run `20260707100001_sku_pricing.sql` (base price + description + tier_species_prices) before demoing Admin prices
- [ ] 🆕 **Schema v3/v4 migration** — apply the finance-analysis DDL: shipments, documents, vendor_invoices(+lines), ap_bills/payments/aging, purchase_order_lines, invoice_lines, sku_entity_codes, qbo_object_links, box logistics columns (trucker, pickup_at, origin, freight_mode, gross_weight, pieces), `operating_entity` enum. — B
- [ ] 🔨 **Profile context** — Nav shows real logged-in user (name/role/initials); viewer role hides admin nav — A
- [ ] 🔨 **QBO application** — submit for production keys today (3–5 day approval); build on sandbox — B
- [ ] 🔨 **Google Cloud** — OAuth consent, Gmail API, credentials stored — B
- [ ] 🆕 **Inngest project** (if adopted) — durable workflow scaffolding, secrets — B

---

## Phase 1 — Core operations live (wire the built UI to the database)

### Dev A — Operations

- [ ] 🔨 **Inventory on DB** — lots/boxes/box_contents from real tables; import confirm + manual add-lot write to DB
- [ ] 🔨 **Allocation board on DB** — orders + per-species fulfillment from the views; click/drag writes `assigned_order_line_id`
- [ ] 🔨 **Realtime board** — two users see each other's assignments without refresh
- [ ] 🔨 **Split / merge on DB** — persist via data-layer mutations; locked contents can't be edited
- [ ] 🔨 **Availability strip** — live available / allocated / incoming per species (excludes direct-routed stock)
- [ ] 🆕 **Orders page on DB** — the central order record (built UI) reads `orders`/`order_lines`; entered-by + timestamps real
- [ ] 🆕 **Versioned allotment locking** — optimistic concurrency (`version_no`) on reservation so two allocators can't reserve the same fish

### Dev B — Data

- [ ] 🔨 **Customers CRUD** — customers + price_overrides + standing_orders on real tables
- [ ] 🔨 **Order intake writes** — creates real orders + species lines; new-customer path inserts a customer; pricing from DB, not constants
- [ ] 🆕 **Price Sheet page reads DB** — species × tier grid + availability from real tables (Admin side already live)
- [ ] 🆕 **Request → Order separation** — model CustomerRequest (demand) distinct from the committed order/allotment, so demand ≠ reservation ≠ posting (prevents shortage/overstatement drift)
- [ ] 🆕 **Order Inbox on DB** — the built AI-parse inbox reads real inbound messages; accept → `createOrder`; reject/edit persist
- [ ] 🆕 **Inbound order parsing (Fresho parity)** — Gmail poller on `orders@…` → LLM parse (customer, species lines, qty, date, confidence) → Order Inbox review → accept. Never auto-commit.
- [ ] 🆕 **Auto order confirmation** — on accept, email the customer a confirmation (Fresho's most-valued behavior)

**✅ Checkpoint:** order intake → Orders page → board → assign/split → survives reload, two users live.

---

## Phase 2 — Vendor intake & document ingestion

### Dev B (primary)

- [ ] 🔨 **Vendor mappings admin** — per-vendor column maps + species-code dictionary editable, drives import
- [ ] 🆕 **VendorProductAlias / canonical products** — map raw vendor text ("Large Yellow Fin (Thunnus albacares)", "YF") → canonical species/grade
- [ ] 🔨 **Server-side import** — upload → parse (CSV + **XLSX**) with mapping → preview → atomic commit RPC; original file kept in Storage
- [ ] 🆕 **Document inbox** — uploaded + Gmail-pulled files; filename routing (LAX/SFO=warehouse, ORD/HNL=direct); parse-status lifecycle; reprocess
- [ ] 🆕 **PDF parsing** — text-layer first, LLM structured-extraction fallback with confidence; **mandatory human review, no auto-commit**
- [ ] 🆕 **Carton-range expander** — `5004, 5005-5009` → box list (dashes, `to`, shorthand, descending, dedupe, span cap)
- [ ] 🆕 **Incoming lots / pre-sell** — lots can be `incoming` (on the water) and sellable ahead
- [ ] 🆕 **WarehousePartner entity** — 3PLs (Main Freight, Sentra, CFI) first-class; per-partner pick-slip context

**✅ Checkpoint:** drop a real vendor file → parsed → reviewed/corrected → committed to inventory.

---

## Phase 3 — Lock pipeline, finance queue & QBO

### Dev A

- [ ] 🔨 **Lock / unlock live** — Lock button → `lock_board` RPC; board freezes for everyone; unlock reverses
- [ ] 🔨 **Pick slips from DB** — species-grouped, partial flags, from real locked allocations
- [ ] 🔨 **Slip PDF + auto-email** — render to PDF, store in Storage, email warehouse on lock

### Dev B

- [ ] 🆕 **Vendor commercial invoices** — `vendor_invoices` + lines (carton refs, pieces, $/lb) from the ingestion path
- [ ] 🆕 **VendorCostLink** — allocate summarized invoice lines down to physical boxes for true landed cost
- [ ] 🆕 **Three-way match** — PO ↔ packing list ↔ invoice with tolerance flags; a green match gates QBO Bill creation
- [ ] 🆕 **PO tracker on DB** — built UI reads `purchase_orders`/lines; **Excel import + export**; replaces the paid bulk tool
- [ ] 🆕 **PO → Bill conversion** — internal PO posts to QBO Bill via `LinkedTxn` (never sent to vendor)
- [ ] 🔨 **Invoices on lock** — a pending invoice per locked order in the Finance Queue
- [ ] 🔨 **QBO push** — OAuth connect, idempotent create (Request-Id), success/failure on cards, using the chosen mapping
- [ ] 🆕 **QBOSyncRecord ledger** — generic local↔QBO id + sync-status + idempotency; webhooks-first + CDC repair
- [ ] 🔨 **Retry worker** — auto-retry failed syncs with backoff (Inngest or cron)
- [ ] 🔨 **QBO production swap** — sandbox → production behind a feature flag; no live invoices until cutover

**✅ Checkpoint:** import → allocate → lock → slip emailed → invoice in QBO sandbox; PO → Bill idempotent.

---

## Phase 4 — Direct shipments & entity (EOF/Mana)

### Dev A

- [ ] 🆕 **Direct-shipment flow** — ORD/HNL shipments skip allocation & warehouse; still create lot/boxes for traceability
- [ ] 🆕 **Reinvoice builder** — vendor invoice lines → customer invoice: new number, same boxes, marked-up rate, live margin, **vendor cost never shown**

### Dev B

- [ ] 🆕 **Entity attribution** — `operating_entity` (MANA/EOF) on orders, invoices, POs, AP; rule: PO present ⇒ EOF
- [ ] 🆕 **Per-entity product codes + invoice numbering** — EOF product codes + separate DocNumber sequences per entity

---

## Phase 5 — Finance exceptions (credits, downgrades, settlement, AP)

### Dev A

- [ ] 🔨 **Credits & downgrades on DB** — claims auto-link vendor/lot/box; counter amounts persist
- [ ] 🆕 **Downgrade evidence** — attach photos/emails to a claim (Storage)
- [ ] 🆕 **Downgrade-by-email intake** — Gmail poller on `credit@manaseafood.com` → parse claim + attachments (photos, invoice, weights) → review queue (sibling of Order Inbox)
- [ ] 🔨 **Customer credit memo → QBO** — approve → QBO credit memo linked to the original invoice

### Dev B

- [ ] 🔨 **Vendor settlement builder** — statements from sold lines + credits + downgrades → net due (lifecycle UI already built)
- [ ] 🆕 **VendorSettlementPolicy** — per-vendor: consignment/monthly-settlement (Tahiti) vs direct credit note
- [ ] 🆕 **Tahiti two-step settlement** — customer downgrade prices entered first → Blake sets final vendor price → report shared; only for monthly-settlement vendors
- [ ] 🆕 **SupplierCreditNote** — direct vendor credit path (most vendors), distinct from the settlement pack
- [ ] 🆕 **Shared-inbox operator queues** — `credit@` / `accounting@` worked by a rotating 24h team; queue items support assignment + shift handoff
- [ ] 🔨 **Email statement + capture reply** — send via Gmail; poller attaches vendor replies to the statement
- [ ] 🆕 **AP module** — `ap_bills` / `ap_payments` / aging view; entity-scoped; bill/payment sync from QBO (webhooks + CDC)
- [ ] 🆕 **Exception queue** — one place for failed syncs + finance exceptions with retry / manual-review status
- [ ] 🅿️🆕 **BILL.com adapter** — **deferred**; compatibility only, not MVP core

---

## Phase 6 — Visibility

### Dev A

- [ ] 🔨 **Notifications live** — real bell + realtime badge; shortage detection creates alerts
- [ ] 🔨 **Operations dashboard live** — KPIs from real queries; date filter drives them
- [ ] 🔨 **Finance + CEO dashboards live** — real aggregates; comparison periods show real deltas
- [x] ✅ GA-style date filter component (wired into CEO/Finance/Ops KPIs)

---

## Phase 7 — Migration, QA & cutover (Both — safety-critical)

- [ ] 🔨 **Sheet export + mapping doc** — the two sheets (Main Freight daily-tab, Sentra/SFO direct); column → table.column mapping
- [ ] 🔨 **Migration scripts** — Sentra/internal sheets → DB, idempotent, rollback per entity
- [ ] 🆕 **Main Freight integration (not replace)** — 3PL owns that sheet; add-only bridge respecting protected/hidden tabs; we sync from it, don't freeze it
- [ ] 🆕 **Google Sheets bridge** — read-only export/parity harness (Sheets API + Drive watch/poll); never canonical
- [ ] 🔨 **Parity checks** — automated report (row counts, lb per lot/species, AR/AP totals) vs sheets/QBO; Blake signs off
- [ ] 🔨 **RLS audit** — all 6 roles see/write only what they should
- [ ] 🔨 **Error / empty / loading sweep** — no blank panels; print CSS re-checked on slips + statements
- [ ] 🔨 **Performance pass** — board responsive at 1,000+ contents; indexes + pagination
- [ ] 🔨 **End-to-end QA matrix** — splits, mixed boxes, shortages, direct shipments, unlock/relock, failed syncs, two concurrent users
- [ ] 🔨 **Pilot run** — parallel to Google Sheets for one real cycle; train Blanca & Sid
- [ ] 🔨 **Cutover** — Blake approves, QBO live, sheets frozen read-only, hypercare

---

## Phase 8 — External Portals (🌐 vendor + customer roles · future iteration, client-requested)

**Blake/Erdolo explicitly asked for these; confirmed "not yet scoped."** They are external, self-service
users — a separate auth surface, tightly RLS-scoped, **not** additions to the internal staff role dropdown.
See `MANA_External_Portals_Scope.md` for the full scope. Gated by the Phase-0 role-approval decision.

### Customer portal (Erdolo's #1 future ask)

- [ ] 🌐 **`customer` role** — external login, org-scoped RLS; sees only their own data
- [ ] 🌐 **Self-service ordering** — order against available inventory at their tier/price; submits a **CustomerRequest** (not a committed order) → lands in the Order Inbox / board for staff confirmation
- [ ] 🌐 **Customer order history + confirmations** — their orders, statuses, invoices, credits
- [ ] 🌐 **Customer downgrade submission** — file a claim with photos/weights (feeds the same credit queue)
- [ ] 🌐 **Hard RLS guard** — never expose other customers, cost, margin, vendors, or the board

### Vendor portal (Erdolo's 2nd iteration)

- [ ] 🌐 **`vendor` role** — external login, vendor-scoped RLS
- [ ] 🌐 **Direct packing-list / invoice upload** — vendor uploads their own docs (ingestion pipeline pointed at a logged-in vendor instead of Gmail)
- [ ] 🌐 **Vendor settlement view** — their own settlement statements / credit notes
- [ ] 🌐 **Hard RLS guard** — **never** revenue, sell prices, margin, customer names, or other vendors
- [ ] 🌐 **Standardized templates (interim)** — ship a common packing-list/invoice template vendors adopt before the portal is live (Blanca confirmed vendors will use one)

---

## Finance-transition side workstream (validate, don't assume — runs parallel)

- [ ] 🆕 Verify TFK invoices/credits closure in QBO (line by line)
- [ ] 🆕 Review AR/AP open-item tracker; import only validated active exceptions
- [ ] 🆕 Confirm BILL.com admin continuity + supplier-payment SOP
- [ ] 🆕 Re-verify Kaila, Pacific Tuna, Akamar, Seattle Fish, Tahiti items
- [ ] 🆕 Define finance data cutoff (historical freeze / forward-run start)

---

## Already delivered — full picture (do not rebuild)

UI (deployed, mostly demo data): allocation board (multi-species contents, per-species fulfillment,
split/merge, drag-drop), order intake (multi-species, new-customer, calendar, 30-sec timer), Orders
page, inventory (mixed boxes, CSV import parser, manual add-lot), pick slips (species-grouped, partial),
customers, finance queue, credits (counter offers), vendor reconciliation (Draft→Sent→Countered→Settled +
activity trail), Purchase Orders tracker (ordered/received/billed/variance + flags + lifecycle), Price
Sheet (tier grid, availability, add-species), Orders page (central record + date filter), Order Inbox
(AI-parse review, Fresho parity), 3 dashboards + date filter, notifications, admin (users/roles/invite,
SKU catalog live, per-species-per-tier pricing live). Database schema v1+v2, auth, typed data layer, ADR,
Vercel deploy.

---

## Naming glossary (handover doc ↔ our schema)

| Handover doc                                                                     | Our schema                                                             |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| VendorShipment                                                                   | `lots`                                                                 |
| BoxContent                                                                       | `box_contents` ✅                                                      |
| SalesOrder / SalesOrderLine                                                      | `orders` / `order_lines`                                               |
| CustomerRequest                                                                  | 🆕 to add (demand, pre-commit)                                         |
| AllotmentSession / AllotmentLine                                                 | allocation board + `board_locks` + content assignment (add versioning) |
| VendorInvoice / VendorInvoiceLine                                                | 🆕 v4                                                                  |
| VendorCostLink                                                                   | 🆕 v4 (line↔box)                                                       |
| ProductVariant / VendorProductAlias                                              | `skus` / `vendor_species_codes` (upgrade)                              |
| QBOSyncRecord                                                                    | `qbo_object_links` 🆕                                                  |
| WarehousePartner, VendorSettlementPolicy, SupplierCreditNote, ExceptionQueueItem | 🆕 to add                                                              |
