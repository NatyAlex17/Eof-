# MANA — External Portals Scope (Vendor & Customer Roles)

**Status:** ✅ **Built (MVP)** — both portals are implemented and wired to Supabase. See
`MANA_Delivered_July.md` for the delivered detail. Original scoping below retained for reference.
**Context:** In the July call, Erdolo explicitly asked for two external-facing capabilities that are
**not in the current scope of work**: customers ordering directly, and vendors uploading directly. Eyoab
confirmed on the call that today the customer never touches the system and neither is written into the SOW.
This doc scoped both; both were subsequently approved and built.

---

## As-built deltas (how the build differs from the original scope)

- **Vendor uploads are a structured form, not file parsing.** Because vendor PDFs aren't standardized
  (analysis option (c)), verified vendors key packing-list lines directly (box #, species, grade, weight,
  pieces, box type) into a hosted form — perfect structure, no parser. This supersedes the "point the
  ingestion pipeline at a logged-in vendor" line below.
- **Vendors no longer submit invoices.** The system **generates** a professional, watermarked commercial
  invoice / packing list from the vendor's structured data (`/mana/documents/[id]/invoice`, print-to-PDF).
- **Vendor verification gate added.** Self-signup vendors start `pending` and cannot submit until staff
  verify them (enforced in RLS). Admin page: `/mana/vendor-verification`.
- **Owners/staff create shipments, not vendors.** Vendor submits paperwork only; staff turn it into a
  shipment in the Documents Inbox (`/mana/documents`).
- **Customer pricing is tier-gated.** New self-signups have no tier and see "prices will be listed shortly"
  until staff assign one; the tier value itself is never shown to the customer.
- **Delivery vs pickup + transport fee** added to customer ordering (staff set the transport fee).

---

## The core principle

MANA's six existing roles (admin, operations, finance, sales, logistics, viewer) are **internal staff** who
see the whole operation. Vendor and customer are **external users** — outsiders logging into _your_ system.
They are not two more staff roles; they are two **separate, narrow front doors** with strict data isolation.

The golden rule: **an external user sees only their own data, and never anything that reveals your economics.**

---

## 1. Customer Portal (Erdolo's #1 future ask)

**Who:** your buyers (restaurants like TFK, Nobu, Blue Marine).
**Why:** replace "customer emails/texts an order → staff retypes it." Let them place it themselves, 24/7.

### What a customer can do

- Log in to a customer-only view (their organization only).
- See **available inventory** at **their** tier price (and their negotiated overrides).
- Place an order — which enters as a **request**, not a committed order. It lands in your **Order Inbox / board** for staff to confirm (staff keep control of price and availability).
- See their **order history**, statuses, confirmations, invoices, and credits.
- Submit a **downgrade claim** with photos/weights (feeds the same credit queue staff already use).

### What a customer must NEVER see

Other customers · your cost or margin · vendor names or vendor pricing · the allocation board · anyone else's orders.

### How it reuses what exists

- A customer submission = the **CustomerRequest** object already on the roadmap (demand, pre-commit).
- It flows into the **Order Inbox** (already built) — same review-and-accept gate as the AI-parsed emails.
- On accept, the same **auto-confirmation** email fires.
  So the portal is mostly a **thin, locked-down front end** onto flows we're already building — not a new system.

### The TFK nuance

TFK is ~50–60% of order volume across ~46 locations, twice weekly, simple loins. The portal (or the Fresho
email tap) should handle **standing orders that fan out to many locations** cleanly — that's where the
volume is.

---

## 2. Vendor Portal (Erdolo's 2nd iteration)

**Who:** your fish suppliers (2 today — e.g. Kona, Tahiti — growing later).
**Why:** replace "vendor emails a spreadsheet → staff upload it." Let them submit directly.

### What a vendor can do

- Log in to a vendor-only view (their shipments only).
- **Upload their packing list / commercial invoice** directly (the same ingestion + review pipeline, just triggered by a logged-in vendor instead of a Gmail attachment — still staff-reviewed before it hits inventory).
- See **their own** shipments/lots and **their own** settlement statements / credit notes.

### What a vendor must NEVER see

**Revenue · your sell prices · margin · customer names · any other vendor.** (Erdolo said this explicitly: "not to see the revenue, not to see all that stuff.")

### How it reuses what exists

- Vendor uploads feed the **document ingestion pipeline** already scoped (parse → human review → commit).
- Vendor settlement view is a read-only slice of the **vendor reconciliation** already built.
- **Interim before the portal:** ship a **standard packing-list/invoice template** vendors adopt (Blanca confirmed they will) — this alone cuts most of the parsing pain and is a fast win.

---

## Why these are a separate phase (not MVP)

1. **Security surface changes.** Internal RLS assumes "all staff can read operational data." External users invert that — every table needs a per-org / per-vendor ownership filter and deny-by-default. That's a deliberate, tested effort, not a toggle.
2. **They depend on MVP being live.** A customer can't order against inventory until inventory is real; a vendor can't see settlements until settlements run. Portals sit _on top of_ the core build.
3. **Adoption + training.** External users need onboarding, support, and (for vendors) the template rollout first.

**Recommended sequencing:** core MVP → **customer portal** (higher value, replaces the biggest manual load and the Fresho dependency) → **vendor portal** (only 2 vendors today, so lower urgency; the standard template covers the interim).

---

## Decisions needed from the client

1. **Approve both roles as a defined future phase?** (Yes/No, and priority order.)
2. **Customer ordering model:** full self-service catalog, or a lighter "reorder my usual / standing order" first? (The lighter version captures most of TFK's value fast.)
3. **Fresho email/API tap** — do we pursue pulling TFK's PO emails straight into MANA in parallel (interim bridge toward the customer portal)?
4. **Vendor template** — ship the standardized packing-list/invoice template now as the interim step before the portal?

---

_Cross-reference: these are Phase 8 in `MANA_Master_Task_List.md`. Data-model hooks (CustomerRequest,
ingestion pipeline, vendor reconciliation, Order Inbox) are already on the roadmap so the portals bolt on
without rework._
