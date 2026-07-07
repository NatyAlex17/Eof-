# QuickBooks Online API Integration Analysis — Seafood Distributor (MANA / EOF)

**Scope:** implementation-ready design notes for QBO Accounting API v3, baseline `minorversion=75` (minor versions 1–74 were deprecated Aug 1, 2025 — anything lower is silently ignored). All entity/field names below are the exact API names. Fact IDs (F1–F23) reference the meeting notes.

**Plan prerequisite (affects almost everything below):** PurchaseOrders, billable expenses ("Track expenses and items by customer" + "Make expenses and items billable"), and inventory tracking all require **QBO Plus or Advanced**. Confirm which SKU each entity (MANA, EOF — F5) is on before building.

**Entity-structure flag (F5):** "PO column empty = MANA, filled = EOF" implies two operating entities. Decide early whether these are **two QBO companies (two realmIds)** — meaning duplicate OAuth connections, duplicate entity sync, per-realm rate limits — or **one company using `ClassRef`/`DepartmentRef`** for segmentation. Everything below is per-realm.

---

## 1. The "Billable" feature (F23) — verdict: use half of it

### How it works in the API

Billable tagging lives on **purchase-side lines** of `Bill`, `Purchase` (expense/check), and `VendorCredit`:

- `Line.DetailType = "ItemBasedExpenseLineDetail"` — fields: `ItemRef`, `Qty`, `UnitPrice`, `CustomerRef`, `BillableStatus`, `ClassRef`, `TaxCodeRef`, `MarkupInfo`
- `Line.DetailType = "AccountBasedExpenseLineDetail"` — fields: `AccountRef`, `CustomerRef`, `BillableStatus`, `MarkupInfo`, `TaxAmount`

`BillableStatus` enum: **`Billable`**, **`NotBillable`**, **`HasBeenBilled`**. You may write `Billable`/`NotBillable`; `HasBeenBilled` is system-set once the charge lands on an invoice (attempting to set it directly errors). A `Billable` line **must** carry `CustomerRef`.

When a line is marked `Billable`, QBO materializes a **`ReimburseCharge`** entity (queryable: `SELECT * FROM ReimburseCharge`) representing the unbilled charge. On invoices that consumed a charge, it appears as `Invoice.LinkedTxn` with `TxnType: "ReimburseCharge"` (readable at minorversion 55+; details of the reimbursed line come through `Line.SalesItemLineDetail.ItemRef` / `ItemAccountRef`).

`MarkupInfo` (on the purchase line / reimburse charge): `PercentBased` (bool), `Value`, `Percent`, `MarkUpIncomeAccountRef`. A company-level default markup % exists in Account Settings.

### The dealbreaker gotcha

**Pulling a billable expense onto a customer Invoice is UI-only. The `ReimburseCharge → Invoice` link is read-only through the API — you cannot create it programmatically.** Intuit has confirmed this repeatedly and it has not changed. So an automated PO → Bill → _auto-generated customer invoice with markup_ flow **cannot** be built on the billable feature.

Additional gotchas:

- Requires Plus/Advanced + both settings enabled ("Track expenses and items by customer", "Make expenses and items billable"); if disabled, `BillableStatus` is silently dropped on write.
- If your pipeline creates invoices independently (which it must — see §4), any `Billable` charges never flip to `HasBeenBilled` and pile up as "unbilled billable expenses" in QBO reports — a permanent red flag for the accountant.
- UI-pulled billable lines can print the expense description (vendor-cost leakage risk) and show markup as a separate line — wrong for a middleman (F15).

### Fit for their flow

**Partial fit.** Recommended pattern:

- **DO** write `CustomerRef` on every Bill line (this alone gives the accountant customer-level cost/profitability reporting in QBO — "Income by Customer Summary" etc.).
- **DO NOT** rely on `BillableStatus=Billable` for the automated flow; set `NotBillable` (or omit) so nothing lingers as unbilled.
- Markup lives in **our system** (per-box, per-customer marked-up rate), and we create the customer Invoice directly (§4). This also solves F15's "different rates, vendor cost hidden" requirement cleanly, which the billable feature cannot.

---

## 2. `PurchaseOrder` entity — replacing the paid bulk-import tool (F20–F22)

### Entity shape

`POST /v3/company/{realmId}/purchaseorder?minorversion=75`

Key fields:

- `VendorRef` (required), `APAccountRef`
- `Line[]` with `ItemBasedExpenseLineDetail` (`ItemRef`, `Qty`, `UnitPrice`, `CustomerRef`, `ClassRef`) — note `CustomerRef` at PO-line level covers F22's "customer" column
- `DocNumber` → their internal order number (21-char max)
- `TxnDate` → order date; `DueDate`; `ShipTo` (a CustomerRef); `ShipAddr`; `ShipMethodRef`
- `POStatus`: `Open` | `Closed` (writable — set `Closed` to manually kill a PO)
- `CustomField[]` (3 string fields, see §4) → box number (F22); weight goes in `Qty` (lbs) with `UnitPrice` = rate/lb
- `Memo`, `PrivateNote`
- `POEmailStatus` — stays `NotSet` as long as you never call the `/purchaseorder/{id}/send` endpoint. **Never call send** (F21: internal-only). QBO POs are non-posting transactions — they hit no ledger until billed, which matches "internal only" perfectly.

### PO → Bill conversion via API (replaces their one-by-one manual conversion, F21)

There is no "convert" endpoint. You **create a Bill that copies the PO's lines and links back**:

```json
{
  "VendorRef": { "value": "56" },
  "DocNumber": "CI-20260701-TAHITI",
  "TxnDate": "2026-07-01",
  "Line": [
    {
      "DetailType": "ItemBasedExpenseLineDetail",
      "Amount": 1250.0,
      "ItemBasedExpenseLineDetail": {
        "ItemRef": { "value": "19" },
        "Qty": 250,
        "UnitPrice": 5.0,
        "CustomerRef": { "value": "102" },
        "BillableStatus": "NotBillable"
      },
      "LinkedTxn": [{ "TxnId": "412", "TxnType": "PurchaseOrder", "TxnLineId": "1" }]
    }
  ]
}
```

Rules and gotchas (from Intuit's "Manage linked transactions" workflow doc + developer forum answers):

- `LinkedTxn.TxnType` is always `"PurchaseOrder"`; place the `LinkedTxn` **on each Bill line** (with `TxnLineId` for line-level matching) — top-level-only links don't reliably surface in the UI.
- **You must copy the line content** (item, qty, price) into the Bill; linking does not import lines.
- When all PO lines are fully billed, QBO flips `POStatus` to `Closed` automatically; partial billing leaves it `Open`. ⚠ VERIFY in sandbox — Intuit's docs are thin here; test partial-quantity bills (they receive partial boxes).
- Updating an _existing_ Bill to add a PO link requires deleting/re-adding the line under a **new** `Line.Id` (QBO mirrors its UI restriction — you can't retro-link an existing line).
- Amount mismatch between PO and Bill is allowed (real invoice weight ≠ PO weight — common with fish); the link still works.

### Full replacement of the paid Excel bulk tool — yes

Design:

1. **Import:** parse finance's xlsx (or generate POs straight from the parsed commercial invoice / packing list, F18) → staging table → **preview UI with manual override on every field** (F18) → push.
2. **Push:** either individual `POST`s (throttled by our per-realm token bucket) or the **`/batch` endpoint — max 30 operations per request** (each op gets a `bId`; per-op success/error in one response — ideal for "import 25 POs, show which 3 failed"). ⚠ Batch endpoint has its own throttle (sources cite 40/min; verify current docs).
3. **Export:** `SELECT * FROM PurchaseOrder WHERE TxnDate >= '...' STARTPOSITION 1 MAXRESULTS 1000` → generate xlsx. Query language: no JOINs, no `OR`, `AND` only.
4. **Idempotency:** stable `requestid` per staging row (see §6) + dedupe on `DocNumber` before push.
5. **One-click Bill conversion** in our UI per PO (or bulk), using the pattern above — kills the "one by one in QBO" chore (F21).

This eliminates the third-party tool's subscription entirely; there is nothing it does that the API doesn't.

---

## 3. AP side (F19): `Bill`, `BillPayment`, `VendorCredit`, aging, payment-status sync

### `Bill`

- `VendorRef` (required), `TxnDate`, **`DueDate`**, `SalesTermRef` (Term entity — sync vendor terms from the commercial invoice F8), `APAccountRef`
- `DocNumber` → **vendor's commercial invoice number** (F8); 21-char limit
- `PrivateNote` → AWB, origin, internal notes (up to 4000 chars; not customer-facing but visible to all QBO users)
- `Balance` (read-only, live remaining balance — your payment-status source of truth), `TotalAmt`
- Lines as in §2.

### `BillPayment`

- `VendorRef`, `PayType`: `Check` | `CreditCard`; `CheckPayment.BankAccountRef` or `CreditCardPayment.CCAccountRef`; `TotalAmt`, `TxnDate`
- `Line[]`: each line = an application of money; `Line.Amount` + `Line.LinkedTxn[]` with `TxnType: "Bill"` (and `TxnId`). **Partial payments:** just set `Amount` < bill balance — QBO recomputes `Bill.Balance`.
- **Applying vendor credits:** include a `LinkedTxn` with `TxnType: "VendorCredit"` alongside the Bill link in the same BillPayment — that's the API mechanism for netting credits against bills.

### `VendorCredit`

Structural mirror of Bill (same line details); represents returns/short-ship adjustments (relevant when actual landed weight < invoiced weight — a fish-business certainty). It sits as negative AP until applied via BillPayment.

### Aging & "vendors not paid on time" (F19)

- **Reports API:** `GET /v3/company/{realmId}/reports/AgedPayables` and `/reports/AgedPayableDetail` (JSON, columnar) — feed a dashboard directly.
- Or compute in our system: `SELECT * FROM Bill WHERE Balance > '0'` + `DueDate` → own aging buckets, overdue alerts, "owner AP vs vendor AP" separation (their AP table distinction).

### Payment-status sync back to our system

- **Webhooks** (§6) on `Bill`, `BillPayment`, `VendorCredit` (operations: Create/Update/Delete/Merge/Void). Payload contains only `{name, id, operation, lastUpdated}` — you must re-fetch the entity. Notifications are **aggregated (~1–5 min batches), not real-time**.
- **Backstop:** ChangeDataCapture — `GET /cdc?entities=Bill,BillPayment,VendorCredit&changedSince={ISO8601}` on a schedule (e.g. hourly). **CDC window is 30 days max**; beyond that, full re-query. Never rely on webhooks alone (they get disabled after repeated delivery failures).
- On each event, re-read `Bill.Balance`: `0` = paid, `< TotalAmt` = partial. Store `Id` + `SyncToken` + `Balance` locally.

---

## 4. Invoice creation — warehouse flow and direct-shipment reinvoicing (F15)

`POST /v3/company/{realmId}/invoice?minorversion=75`

### Shared mechanics

- `CustomerRef` (required)
- `DocNumber` → **your own new invoice number** (F15). Requires "Custom transaction numbers" enabled in company settings, otherwise QBO auto-numbers and ignores yours. Uniqueness is NOT enforced unless the duplicate-warning setting is on — enforce in our system.
- `TxnDate`, `DueDate`, `SalesTermRef`
- `ShipDate` (**date only — no time component**; pickup _time_ (F4) must live in our system / a custom field / the memo), `TrackingNum` (AWB), `ShipMethodRef` (freight mode F7: Trucker / Air Freight / Customer Pickup — seed these as ShipMethod values), `ShipFromAddr` (origin, F2), `ShipAddr`
- `CustomerMemo` (prints on invoice), `PrivateNote` (does not print)
- `BillEmail` + `POST /invoice/{id}/send` to email; or `GET /invoice/{id}/pdf` to pull the PDF and send from our system (more control over branding).

### Line strategies

- **`SalesItemLineDetail`** (posting lines — required for revenue & any inventory/COGS behavior): `ItemRef` (species+grade item; EOF `Sku` F6), `Qty` = **pounds** (decimals fine, F3), `UnitPrice` = **marked-up rate/lb**, `Amount`, `ServiceDate`, `ClassRef`. Put box/carton info in `Description` (4000 chars) — e.g. `"Boxes 5005-5009, 5012 — Ahi #1, ex-Tahiti"` (handles F9's single/range/comma formats verbatim).
- **`DescriptionOnly`** lines (`DetailType: "DescriptionOnly"`, `DescriptionLineDetail`): non-posting text rows — perfect for box-group headers ("── Box 5004 (Tahiti) ──") between item lines, mirroring the vendor invoice's carton layout without affecting totals.
- `SubTotalLineDetail` for per-shipment subtotals if desired.

### Custom fields (box numbers etc.)

Legacy `CustomField[]`: **exactly 3 string fields** via the classic REST API (`DefinitionId` "1"/"2"/"3", `Type: "StringType"`, `StringValue`). Even on QBO Advanced (10+ typed fields), **only the first three string fields flow through the classic API**; the rest need the new GraphQL Custom Fields API (`include=enhancedAllCustomFields` on reads at mv75). ⚠ Values are short (UI limit ~31 chars) — a long comma list of cartons won't fit. **Recommendation:** custom fields for `AWB`, `Origin`, `Lot/Shipment ID`; box numbers in line `Description` (authoritative copy in our DB).

### Direct-shipment reinvoicing (F15) — exact recipe

1. Parser ingests vendor commercial invoice (F8, F14) → structured lines (carton #s F9, species, lbs, vendor unit price).
2. Human review screen (F18): fix parse errors, apply per-customer markup rules → **customer rate/lb**.
3. Create Invoice: our `DocNumber`, same boxes/items as description+lines, marked-up `UnitPrice`. Vendor's invoice never forwarded; vendor cost never written to any customer-visible field.
4. Separately create the `Bill` (vendor side, real cost) — **no billable link between them** (see §1); our system stores the box-level cost↔revenue join and computes true margin per box.

**Vendor-cost-hiding rules:** cost only ever appears on Bill/PO objects (vendor-side, never printed to customers); never in Invoice `Description`, `CustomerMemo`, or custom fields; `PrivateNote` is acceptable but remember any QBO user sees it. Don't use the UI billable-pull (can expose expense description / markup as its own line).

Since direct shipments never touch inventory (F13), direct-shipment invoice lines should use **non-inventory items** regardless of what §5 decides — otherwise QBO would decrement stock that was never received.

---

## 5. The QBO inventory question (F17)

Current state: QBO Inventory-type Items decrement QOH on invoice (their "turned to bill" observation is invoice/bill posting driving QOH/COGS).

**What QBO inventory is:** `Item` with `Type: "Inventory"`, `TrackQtyOnHand: true`, `QtyOnHand`, `InvStartDate`, `AssetAccountRef`, `IncomeAccountRef`, `ExpenseAccountRef` (COGS). Costing is **FIFO only**. **No lot/batch tracking, no box numbers, no multi-warehouse locations, no catch-weight** — a "box containing mixed species / grade-split items with individual fish weights" (F1, F3) is unrepresentable. ⚠ Long-standing gap: **no inventory-quantity-adjustment endpoint in the classic API** (adjustments are UI-only) — verify current status, but do not design around its existence.

### Option (a): keep QBO inventory items, sync from our system

- Items = species×grade, `Qty` in lbs. Purchases (Bills) add QOH; Invoices decrement — preserves today's behavior and the accountant's native QOH/COGS/margin reports.
- **Cons:** two writable inventory truths ⇒ guaranteed drift (shrink, ice-weight variance, re-grading, box splits have no QBO representation and no adjustment API to reconcile). Invoice-before-Bill sequencing (common for them) drives **negative QOH → FIFO COGS estimated then retroactively restated** — accountant pain. Item catalog explodes if origin/box enters the item name.

### Option (b): non-inventory/service items; our system is the sole inventory truth — **RECOMMENDED**

- Convert items to `Type: "NonInventory"`, dual-purpose (both "I sell" `IncomeAccountRef` and "I purchase" `ExpenseAccountRef` pointing at **COGS**). Bills post cost straight to COGS at receipt (periodic method); Invoices post revenue. Prices always overridden per transaction (fish prices vary per shipment), so `UnitPrice`/`PurchaseCost` on the item are irrelevant defaults.
- Our system holds the real model: box → items → species/grade/origin/weights/lot, allocation, QOH at LAX/SFO.
- **Month-end true-up:** our system computes ending inventory valuation and posts a `JournalEntry` via API (Dr Inventory Asset / Cr COGS, reversed next period) — the accountant gets accurate financials without QBO ever tracking quantity.
- **Why it wins:** zero drift by construction (QBO stores no QOH to drift); no negative-QOH/FIFO restatements; box-level granularity lives where it can actually be modeled; direct shipments (F13) naturally never touch stock. Cost: accountant loses in-QBO per-item QOH reports — replaced by our dashboards + the monthly JE. This matches their stated goal (F18: system ingests documents, sheets die, our system is the operational brain).
- **Gotcha:** changing an Item's `Type` Inventory→NonInventory is restricted; plan a cutover (deactivate old inventory items via `Active:false`, create new non-inventory items, zero out remaining QOH with the accountant in the UI).

### Option (c): hybrid

Inventory items for warehouse (LAX/SFO) stock, non-inventory for direct shipments. Viable as a **transition state** (keeps the accountant's current warehouse reports while the new system earns trust), but it inherits every (a) drift problem for the warehouse half and doubles the item catalog. Treat as phase 1 only, with (b) as the destination.

---

## 6. Operational facts

**OAuth2:** Authorization-code flow, scope `com.intuit.quickbooks.accounting`; `realmId` arrives on the callback. Access token = **60 min**; refresh token valid **100 days** BUT **a new refresh token is issued roughly every 24–26 h on refresh, and the old one is invalidated** — persist the latest refresh token atomically (transactional write, single refresher process with a mutex; a lost rotation = full re-auth). Handle `invalid_grant` by triggering re-connect UX. Token endpoint: `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`. One connection per realm (two if MANA and EOF are separate companies — F5).

**minorversion:** send `minorversion=75` on every call (1–74 deprecated Aug 2025, silently coerced to 75 — pin it explicitly so behavior is deterministic).

**Idempotency:** add `requestid=<uuid>` query param on writes; same realm + same `requestid` returns the original response instead of duplicating. Generate the UUID per logical operation (per staging row), reuse on retries. In `/batch`, per-op `bId` serves correlation; still set a request-level `requestid`.

**Rate limits (per realm, per app):** **500 requests/min**, **10 concurrent**; `/batch` max **30 ops/request** with its own throttle (reported 40 batch-calls/min ⚠ verify). 429 ⇒ exponential backoff + jitter; implement a per-realm token bucket + concurrency semaphore in the worker queue.

**Sandbox vs production:** base URLs `https://sandbox-quickbooks.api.intuit.com` vs `https://quickbooks.api.intuit.com`; separate client keys per environment. Create a **Plus** sandbox company and switch on: custom transaction numbers, billable-expense settings, inventory (for testing option (a)/(c)), 3 custom fields, ShipMethod values. Verify in sandbox: PO auto-close on full billing, partial-bill behavior, custom-field write-back, invoice PDF layout (vendor-cost leakage check).

**Webhooks:** configured per app + environment in the developer portal (pick entities: Bill, BillPayment, VendorCredit, Invoice, Payment, Customer, Vendor, Item). Verify `intuit-signature` header = HMAC-SHA256 of raw body with your **verifier token**. Payloads are **aggregated (~1–5 min)** and contain only entity name/id/operation/lastUpdated — always re-fetch. Return 200 fast (enqueue, don't process inline); repeated failures ⇒ Intuit suspends the subscription. Backstop with CDC (`/cdc?entities=...&changedSince=...`, ≤30-day window) hourly + nightly reconciliation of `Balance`/`SyncToken`s.

**Entity sync (Customers/Vendors/Items):**

- Initial pull: paginated query (`STARTPOSITION`/`MAXRESULTS 1000`); store `Id` + `SyncToken` + our foreign key.
- Every update needs the **current `SyncToken`** (optimistic lock; stale token ⇒ error 5010 — re-read, merge, retry). Use `sparse: true` for partial updates.
- **`DisplayName` is unique across the combined Customer+Vendor+Employee namespace** — a company that is both a customer and a vendor needs name variants ("Acme (V)").
- No hard deletes for name entities: `Active:false`; include `WHERE Active IN (true,false)` when syncing to see deactivated records. Duplicate-name error code 6240.
- Items: enforce a canonical species+grade catalog in our system; `Sku` carries the EOF product code (F6); create-on-demand from the parser with manual-confirm (F18) to avoid catalog sprawl.

**Field mapping quick reference (meeting facts → QBO):**

| Fact  | Data                                          | QBO home                                                                                                        |
| ----- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| F1/F9 | Box/carton numbers (single, range, comma mix) | Line `Description` (+ short custom field); canonical in our DB                                                  |
| F2    | Origin (Tahiti…)                              | Invoice `ShipFromAddr` / custom field                                                                           |
| F3    | Weights (lbs)                                 | `Qty` on sales & expense lines (lbs), `UnitPrice` = rate/lb                                                     |
| F4    | Trucker / pickup date+time                    | `ShipMethodRef` + `ShipDate` (**no time-of-day in QBO** — keep time in our system)                              |
| F5    | MANA vs EOF                                   | Separate realms or `ClassRef`/`DepartmentRef` — decide first                                                    |
| F6    | EOF product code / selling price              | `Item.Sku` / per-line `UnitPrice` override                                                                      |
| F7    | Freight mode                                  | `ShipMethodRef` values: Trucker, Air, Customer Pickup                                                           |
| F8    | Vendor invoice no / terms / AWB               | `Bill.DocNumber` / `SalesTermRef` / `TrackingNum` or custom field                                               |
| F22   | PO fields                                     | `PurchaseOrder`: `DocNumber`, `TxnDate`, `Line.ItemRef/Qty/UnitPrice`, line `CustomerRef`, custom field for box |

**Bottom-line architecture:** our system = operational truth (boxes, lots, weights, allocation, markup, inventory); QBO = financial ledger (POs as non-posting internal docs, Bills/AP, Invoices/AR, monthly inventory JE). The parser (xlsx/PDF commercial invoice + packing list) feeds a review-first staging layer with manual override on every field (F18); Google Sheets retire once the allocation UI replaces the per-customer tabs (F16).

Sources: [Bill API reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill), [PurchaseOrder API reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchaseorder), [Invoice API reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice), [Manage linked transactions (Intuit)](https://developer.intuit.com/app/developer/qbo/docs/workflows/manage-linked-transactions), [Reimburse charge support (Intuit Dev Blog)](https://blogs.intuit.com/2017/06/21/reimburse-charge-support-quickbooks-online-api/), [Reimburse charge support (Medium/IntuitDev)](https://medium.com/intuitdev/reimburse-charge-support-with-quickbooks-online-api-bb0422872760), [Minor versions of the API](https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api/minor-versions), [Accounting API changes / mv75 deprecation](https://blogs.intuit.com/2025/01/21/changes-to-our-accounting-api-that-may-impact-your-application/), [Custom Fields API blog](https://blogs.intuit.com/2025/12/01/custom-fields-api-extending-quickbooks-online-with-flexible-metadata/), [Manage custom fields (legacy)](https://developer.intuit.com/app/developer/qbo/docs/workflows/create-custom-fields/create-custom-fields-legacy), [Enter billable expenses (QuickBooks help)](https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-customers/enter-billable-expenses/L37dCZU5O_US_en_US), [Billable costs in Essentials (community)](https://quickbooks.intuit.com/learn-support/en-us/other-questions/are-billable-costs-an-option-in-quickbooks-online-essentials/00/907382), [Handling OAuth token expiration](https://help.developer.intuit.com/s/article/Handling-OAuth-token-expiration), [Refresh token validity policy](https://help.developer.intuit.com/s/article/Validity-of-Refresh-Token), [Set up OAuth 2.0](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0), [Webhooks for QBO REST APIs](https://help.developer.intuit.com/s/article/Webhooks-for-QuickBooks-Online-REST-APIs), [QuickBooks API rate limits (Coefficient)](https://coefficient.io/quickbooks-api/quickbooks-api-rate-limits), [QBO rate limits guide (Satva)](https://satvasolutions.com/blog/quickbooks-online-api-limitations-guide), [QBO integration guide (Knit)](https://www.getknit.dev/blog/quickbooks-online-api-integration-guide-in-depth), [Link Bill to PO (Intuit help)](https://help.developer.intuit.com/s/question/0D54R00009ch166SAA/how-can-i-link-a-bill-to-a-purchaseorder-using-the-qbo-api)
