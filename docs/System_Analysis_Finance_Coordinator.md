# System Analysis — Finance Coordinator Meeting

**Synthesis of the four detailed analyses in [docs/analysis/](analysis/):**
[01 Schema audit](analysis/01-schema-audit.md) · [02 UI audit](analysis/02-ui-audit.md) · [03 QBO deep dive](analysis/03-qbo-deep-dive.md) · [04 Ingestion architecture](analysis/04-ingestion-architecture.md)

Every meeting fact was numbered F1–F23 and traced through all four documents; a completeness pass confirmed
all 23 are addressed. This document is the reconciled master: what the meeting changed, every gap, the
mechanisms to build, and the decisions that must be made before building.

---

## 1. The headline: five subsystems the meeting revealed that we do not have

| #   | Subsystem                      | Why it matters                                                                                                                                                                                  | Today in our system                                                |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | **Direct shipments** (ORD/HNL) | A whole revenue lane — vendor ships straight to the customer, never touches a warehouse, never appears in the Google Sheets. Invisible in every flow we built.                                  | Nothing. Every flow assumes warehouse → allocation → pick slip.    |
| 2   | **Vendor commercial invoices** | The _authoritative_ vendor document (may arrive without a packing list). Drives AP, the middleman re-invoice, and true landed cost.                                                             | Nothing. Our `invoices` table is AR (customer-side) only.          |
| 3   | **Accounts Payable**           | Bills, due dates, partial payments, aging — "they don't always pay on time." Entity-scoped (vendors AND system owners).                                                                         | Nothing. Vendor recon ≠ AP.                                        |
| 4   | **Internal Purchase Orders**   | Finance keys POs (customer, order no, order date, items, weight, box number, rate/lb), converts each to a QBO Bill one by one, and **pays for a third-party tool** to bulk-import POs into QBO. | A minimal stub table (vendor, species, expected lb). No UI at all. |
| 5   | **EOF / MANA entity split**    | "PO empty = MANA, filled = EOF." Two operating entities during the wind-down; different product codes; AP and invoices must be attributable per entity.                                         | Zero entity concept anywhere.                                      |

Plus one **workflow requirement that reshapes all ingestion**: manual override on almost everything,
because parsers can be wrong (F18). Every parsed field must be human-editable with an audit trail, and
nothing auto-commits.

## 2. Fact-by-fact status (F1–F23)

| Fact                                                                                   | Status                                                                                                                                                               | Where it lands |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| F1 Mixed species / same species split by grade per box                                 | ✅ Covered by `box_contents` — but `order_lines unique(order_id, species)` blocks ordering one species at two grades → **fix: unique on (order_id, species, grade)** |
| F2 Origin ("coming from", Tahiti)                                                      | ❌ Gap → `shipments.origin` (+ `lots.origin` fallback)                                                                                                               |
| F3 Box total lb + per-fish weights                                                     | 🟡 Partial → add `boxes.gross_weight_lb` (declared, reconciled vs contents sum), `pieces`, optional `box_pieces` per-fish table                                      |
| F4 Per-box trucker + customer + pickup date **and time**                               | ❌ Gap → `boxes.trucker`, `boxes.pickup_at timestamptz`, `boxes.customer_id` (order-level carrier/ship_date become defaults)                                         |
| F5 PO empty=MANA / filled=EOF                                                          | ❌ Gap → `operating_entity` enum on boxes, orders, invoices, POs, AP bills; rule: PO link ⇒ EOF                                                                      |
| F6 EOF product codes + optional selling price                                          | ❌ Gap → `sku_entity_codes` (per-entity code, per-entity QBO item, default selling price)                                                                            |
| F7 Freight mode: trucker / air / self-pickup                                           | 🟡 Free text today → `freight_mode` enum at box level                                                                                                                |
| F8 Commercial invoice (sold-to, terms, AWB, cartons, pieces, $/lb…)                    | ❌ Gap → `vendor_invoices` + `vendor_invoice_lines`                                                                                                                  |
| F9 Carton refs: `5004`, `5005-5009`, comma mixes                                       | ❌ Gap → carton-range expander (spec'd with edge-case truth table in [04](analysis/04-ingestion-architecture.md))                                                    |
| F10 Packing list extras (box type, gel ice, net kg, unit/box)                          | 🟡 Partial → columns on `boxes` + `vendor_mappings` v2 per doc-type                                                                                                  |
| F11 Packing list = EOF template?                                                       | ❓ **Ask the coordinator** — if yes, the packing parser becomes fixed-format (cheap + reliable)                                                                      |
| F12 Filename routing LAX/SFX/SFO=warehouse, ORD/HNL=direct                             | ❌ Gap → classifier stage; token persisted for audit; reviewer can override                                                                                          |
| F13 Direct shipments not in Sheets                                                     | ❌ Gap → `shipments.routing='direct'`; excluded from availability; skips allocation                                                                                  |
| F14 Invoice may arrive without packing list                                            | ❌ Gap → invoice-only commit path builds shipment/boxes from invoice lines                                                                                           |
| F15 Middleman re-invoice (new number, same boxes, marked-up rates, vendor cost hidden) | ❌ Gap → `invoice_lines` with `source_vendor_invoice_line_id` lineage + Reinvoice Builder UI                                                                         |
| F16 Sheets = per-customer tabs + inventory tab                                         | ✅ Functionally replaced by allocation board + availability view                                                                                                     |
| F17 QBO decrements inventory on sale today                                             | 🟡 → deliberate decision required (see §5.3)                                                                                                                         |
| F18 Ingest docs, skip Sheets, manual override everywhere                               | 🟡 → full pipeline designed in [04](analysis/04-ingestion-architecture.md); alternatives compared in §6                                                              |
| F19 AP (vendors + system owners), late payments                                        | ❌ Gap → `ap_bills`, `ap_payments`, `ap_payment_applications`, `ap_aging` view, entity-scoped                                                                        |
| F20 Paid third-party PO bulk-import tool                                               | ❌ Gap → replace outright via QBO API (batch endpoint, 30 ops/request) + Excel import/export in our UI                                                               |
| F21 PO → Bill conversion, one by one, internal-only                                    | ❌ Gap → one-click (or bulk) conversion: Bill created with per-line `LinkedTxn{TxnType:"PurchaseOrder"}`                                                             |
| F22 PO fields (customer, order no, date, items, weight, box no, rate/lb)               | ❌ Gap → `purchase_order_lines` + header extensions                                                                                                                  |
| F23 QBO "billable" feature                                                             | ✅ Investigated — verdict below (§5.1)                                                                                                                               |

## 3. What we must ADD

### 3.1 Schema — migration v4 (full DDL drafted in [01](analysis/01-schema-audit.md), reconciled notes below)

New: `operating_entity` + `freight_mode` + routing/status enums · `documents` (ingest state machine:
received→classified→parsing→parsed→needs_review→approved→committed, with sha256 dedupe, filename routing
token, parse payloads, `manual_overrides` audit) · `shipments` (vendor, AWB, origin, routing, destination
code, direct-customer, entity) · `vendor_invoices` + `vendor_invoice_lines` (+ resolved line↔box links) ·
`ap_bills` / `ap_payments` / `ap_payment_applications` + `ap_aging` view · `purchase_order_lines` + PO
header extensions (customer, order, entity, qbo ids, bill_status, import batches) · `invoice_lines` (AR,
with vendor-line lineage for re-invoicing) · `sku_entity_codes` · `qbo_object_links` (generic local↔QBO
sync state) · `box_pieces` (optional per-fish weights).

Altered: `boxes` (+trucker, pickup_at, customer_id, freight_mode, box_type, ice_type, net_kg,
gross_weight_lb, pieces, purchase_order_id, entity) · `order_lines` unique-constraint fix (species+grade) ·
`vendor_mappings` (per doc-type, + invoice header cell refs, + packing extras) · `availability_by_species`
excludes direct-routed stock · `lots.shipment_id`.

**Reconciliations made between the two DDL proposals** (schema audit vs ingestion doc):
carton expansion stored as **`text[]` canonical labels** (not `int[]` — real labels have prefixes like
`B-4471`); keep **both** `shipments` (logistics anchor) **and** the document state machine (the ingestion
doc's richer `ingest_documents` design wins for the table shape, renamed `documents`); AP lives in the
dedicated `ap_bills` tables (not just a status column on `vendor_invoices`) with the vendor invoice linking
to its bill; direct shipments still create lots+boxes (so credits/downgrades/recon keep working) but with
`routing='direct'` — no new lot status needed.

### 3.2 UI — five new pages + eight extensions (full list in [02](analysis/02-ui-audit.md))

New pages: **Document Inbox** (uploads + Gmail, route badge, parse status, reprocess) · **Invoice Review**
(original file side-by-side with an editable parsed grid; carton chips; match panel; every cell
overridable with reason) · **Direct Shipments + Reinvoice Builder** (vendor lines left, customer draft
right, editable marked-up rate + live margin per line, vendor cost never printed) · **Purchase Orders**
(F22 grid, Excel import/export, push to QBO, convert-to-bill tracking) · **Accounts Payable** (bills, due
dates, aging buckets, payment status, entity filter).

Extensions: inventory (origin, gross-vs-contents mismatch flag, per-box logistics, editable import
preview), order intake (entity selector, PO ref, freight mode), finance queue (entity column, line
drill-down, direct badge), pick slips (per-box trucker/pickup, suppressed for direct), vendor recon
(settle → emits AP bill), finance dashboard (AP aging beside AR), admin (invoice mappings, entity code
map, routing tokens), Nav (four new links).

Shared components: `CartonRangeInput`, `EditableParseGrid` (parsed-vs-corrected with reasons),
`EntityBadge`.

### 3.3 Mechanisms (how, not just what)

1. **Ingestion pipeline** (detailed in [04](analysis/04-ingestion-architecture.md)): intake (upload +
   Gmail poll) → classify (doc kind, vendor, route from filename — never guessed when ambiguous) → parse
   (SheetJS deterministic for xlsx; PDF text-layer first, Claude structured-extraction fallback with strict
   JSON schema + confidence) → normalize (species codes, kg→lb, carton expansion, arithmetic validators) →
   **mandatory human review** (no auto-commit path exists, even at 100% confidence) → atomic commit via
   `security definer` RPCs → link. Parsing runs in the NestJS worker (BullMQ), commit logic in Postgres,
   preview in the browser — one shared `packages/ingestion` package so preview and commit can never diverge.
2. **Carton-range expander**: handles unicode dashes, `to/thru`, suffix shorthand (`5005-9`), descending
   ranges, zero-padding, 1000-span typo cap, duplicate coverage — with a written unit-test truth table.
3. **Three-way match**: PO ↔ packing list ↔ commercial invoice, with tolerance rules (weight: max(1 lb, 2%);
   price: max($0.05, 2%)) and typed discrepancy flags; a fully green match becomes the precondition badge
   for creating the QBO Bill. This is a finance-grade control they have never had.
4. **Re-invoice recipe** (direct shipments): parsed vendor invoice → review → markup per customer →
   create OUR invoice (own number, same boxes as line descriptions, marked-up $/lb) → separately create the
   vendor Bill. Vendor cost never appears in any customer-visible field; margin per box computed in our DB.

## 4. QBO integration — deep-dive verdicts (full detail in [03](analysis/03-qbo-deep-dive.md))

### 4.1 The "billable" feature (their question) — use half of it

`BillableStatus=Billable` + `CustomerRef` on Bill lines creates reimbursable charges — **but pulling a
billable charge onto a customer invoice is UI-only; the API cannot create that link.** So the automated
PO→Bill→auto-invoice-with-markup dream does **not** work on this feature. Verdict: write `CustomerRef` on
every Bill line (gives the accountant per-customer profitability in QBO), set `NotBillable`, and keep
markup + invoice creation in our system — which also solves the vendor-cost-hiding requirement the billable
UI flow would leak.

### 4.2 Replacing the paid PO tool — fully possible

`PurchaseOrder` API + the `/batch` endpoint (30 ops/request) covers bulk import; query API covers export;
`LinkedTxn` on Bill lines covers PO→Bill conversion (no "convert" endpoint — you create the Bill copying
lines + link). POs are non-posting and we never call `/send` — matching their internal-only rule. Their
third-party subscription becomes redundant. Verify in sandbox: auto-close of fully-billed POs, partial
billing behavior.

### 4.3 The inventory question — recommend our system as sole truth

QBO inventory is FIFO-only, no lots, no boxes, no catch-weight, and **no API endpoint for quantity
adjustments** — a mixed-grade fish box is unrepresentable. Recommendation: **non-inventory items in QBO;
our system owns quantity truth; a monthly inventory-valuation journal entry keeps the books right.**
Hybrid (inventory items for warehouse only) is acceptable as a transition but inherits drift. This changes
their current behavior (QBO decrements on sale today) → needs Blake + accountant sign-off.

### 4.4 Entity decision that gates everything

"MANA vs EOF" is either **two QBO companies (two realms, two OAuth connections, per-realm rate limits)** or
**one company with ClassRef/DepartmentRef**. Everything — AP, invoices, POs, item catalogs — is per-realm.
This must be answered before any QBO code is written. (Given the EOF wind-down letter, two realms is most
likely.)

Operational essentials baked into the design: minorversion=75 pinned, `requestid` idempotency everywhere,
500 req/min + 10 concurrent per realm (token bucket in the worker), refresh-token rotation persisted
atomically, webhooks (aggregated, 1–5 min) + hourly CDC backstop, `SyncToken` optimistic locking,
DisplayName uniqueness across Customer/Vendor namespaces.

## 5. Google Sheets — alternatives, honestly compared

| Option                                                                       | Verdict                                                                                                                       |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **(a) Full document ingestion** (packing list + commercial invoice → system) | **Recommended end-state.** Single truth; also captures direct shipments, which the Sheets never see.                          |
| (b) Google Sheets API sync                                                   | Not a destination — but **do build it read-only as the parity/QA harness** for cutover, then delete it.                       |
| (c) Vendor portal                                                            | Not now — adoption risk. The cheap 80%: confirm F11 and standardize the packing-list template EOF apparently already authors. |
| (d) Email-only ingestion                                                     | A subset of (a), not an alternative — ship Gmail as the second intake channel, keep upload for corrected files.               |

Migration path: upload-only ingestion first (staff still double-enter) → Gmail intake + weekly parity
reports vs Sheets → QBO Bill sync + AP + three-way match gates → cutover (Sheets frozen) → optional
per-vendor template hardening.

## 6. Decisions needed (blockers) and open questions

**Decisions (Blake / accountant):**

1. EOF & MANA: one QBO company with classes, or two companies/realms? _(gates all QBO work)_
2. Inventory truth: adopt the non-inventory-items recommendation (QBO stops tracking QOH)? _(changes current behavior)_
3. Confirm QBO plan is Plus/Advanced for each entity (POs + custom txn numbers require it).

**Questions (finance coordinator):** 4. F11 — is the packing list an EOF-authored template? (If yes: fixed-format parser, near-100% reliability.) 5. "AP for the system owners" — does this mean intercompany EOF↔MANA payables, or owner loans? (Determines whether we model intercompany balances.) 6. Get 2–3 real samples each of: commercial invoice xlsx, packing list, the PO Excel used with the paid tool, and one direct-shipment (ORD/HNL) document set — parsers are built against real files, not descriptions. 7. Which third-party PO tool is it (name/cost)? — for the "this subscription goes away" line item.

**Flags all four analyses missed (added by the completeness pass):**

- **Per-entity invoice numbering** — EOF and MANA need separate DocNumber sequences (custom transaction
  numbers per realm; uniqueness enforced by us, QBO doesn't).
- **Commissions** — the accounting partner's earlier email demanded commission tracking; none of the new
  tables carry a sales-rep/commission field yet. Reserve `orders.sales_rep_id` + a commission rules table
  for a later phase, but don't design it out.
- **Credits on direct shipments** — customer claims on ORD/HNL shipments must still flow to vendor recon;
  works because direct shipments create lots too — state it as an explicit test case.
- **Landed cost** — Blake's "true landed cost" requirement now has its data source (vendor invoices +
  freight lines); keep freight lines parseable rather than discarding non-fish invoice rows.

## 7. Task-breakdown deltas (adds to docs/MANA_Task_Breakdown.md)

**Dev A (+4):** Direct Shipments page + reinvoice builder UI · box-level logistics capture (trucker,
pickup datetime, freight mode) on inventory/pick-slips · entity badges + filters across orders/invoices ·
review-screen `EditableParseGrid` + carton input components.

**Dev B (+6):** Migration v4 (the DDL above) · document pipeline (intake, classify, parsers, LLM fallback,
commit RPCs) · matching engine + three-way match flags · AP module (bills/payments/aging + QBO Bill/
BillPayment sync + webhooks/CDC) · PO module (Excel import/export, QBO push via batch, PO→Bill conversion)
· entity plumbing in the QBO layer (realm strategy, per-entity items/sequences).

**Timeline honesty:** this is roughly **+2 to +3 weeks** of scope on top of the existing plan (the AP + PO

- ingestion pipeline are each ~a week of Dev B work; direct shipments ~a week of Dev A). Either extend the
  8-week plan to ~10, or explicitly stage AP/PO/direct-shipments as Phase 1.1 right behind the warehouse MVP.
  Recommended sequencing: warehouse core first (unchanged), ingestion + direct shipments next (they gate the
  Sheets retirement), AP/PO last (they replace tools that currently work, painfully but reliably).
