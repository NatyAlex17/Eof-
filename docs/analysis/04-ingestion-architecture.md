# Document-Ingestion Architecture — Packing Lists & Commercial Invoices

**MANA/EOF ERP · Next.js (apps/web) + NestJS worker (apps/api) + Supabase Postgres**
Implementation-ready design. Meeting facts referenced by ID (F1–F23). Grounded in the code that exists today.

---

## 0. Grounding — what already exists and what we reuse

| Asset                                                                                                                                                                                                       | Location                                                                                                    | Reuse                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client CSV parser with per-vendor column maps, species-code dictionary, kg→lb (×2.20462), row-skip reporting, box-grouping (rows sharing a box label → one multi-species box), preview-before-commit drawer | `apps/web/src/app/mana/inventory/page.tsx` (`VENDOR_MAPPINGS`, `SPECIES_CODES`, `parseCsv`, `applyMapping`) | This is the **client preview** stage of the new pipeline, generalized to XLSX via SheetJS. The `applyMapping` normalization logic (group-by-box, code translation, uom conversion, skipped-rows) moves into a shared package so client preview and server authoritative parse run identical code.                                   |
| `vendor_mappings` (one row per vendor: `box_col/weight_col/species_col/grade_col/uom`), `vendor_species_codes`                                                                                              | `supabase/migrations/20260702100001_schema_v2_fixes.sql` §6                                                 | Extended per §2.1 below — becomes `unique(vendor_id, doc_type)` with invoice-specific columns.                                                                                                                                                                                                                                      |
| `vendor_emails` (gmail_message_id unique, `parse_status` enum `pending/parsed/needs_review/posted`, `attachment_urls jsonb`), `integration_tokens` (provider `gmail`/`qbo`, RLS deny-all)                   | `supabase/migrations/20260630090001_schema.sql`                                                             | Gmail intake writes here; `ingest_documents` FKs to it.                                                                                                                                                                                                                                                                             |
| `lots` (has `incoming` status), `boxes(lot_id,label,idx)`, `box_contents(species,grade,weight,...)`, `purchase_orders` (minimal), `invoices` (**AR only** — customer-side), `audit_log`                     | both migrations                                                                                             | Commit targets. Note: F8's commercial invoice is a **vendor (AP) invoice** — the existing `invoices` table is AR. New `vendor_invoices` tables required (F19).                                                                                                                                                                      |
| Architecture rules                                                                                                                                                                                          | `RULES.md`                                                                                                  | §2.3: email/BOL parsing MUST be a background job with job id, idempotency key, status, retry, DLQ. §3.3: invalid data is rejected/quarantined, never silently passed. §4: manual override requires permission + reason capture. §5: cent-level validation; no duplicate QBO documents. §2.1: Redis + worker, S3-compatible storage. |

Monorepo placement: `apps/web` (Next), `apps/api` (NestJS, currently empty scaffold), plus a new shared package `packages/ingestion` for parser/normalizer/expander code used by both.

---

## 1. Pipeline — stages, state machine, storage

### 1.1 Stage diagram

```
 INTAKE                CLASSIFY               PARSE                NORMALIZE           REVIEW (mandatory)      COMMIT (atomic)         LINK
┌─────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌───────────────┐   ┌────────────────────┐   ┌──────────────────┐   ┌─────────────────┐
│ Upload UI   │   │ doc_kind:        │   │ xlsx: SheetJS    │   │ species codes │   │ field-level edit + │   │ Postgres RPC:    │   │ invoice_line ↔  │
│ (drag/drop) │──▶│  packing_list /  │──▶│  deterministic   │──▶│ kg→lb         │──▶│ reason capture;    │──▶│ commit_packing_  │──▶│ packing box ↔   │
│ Gmail poll  │   │  commercial_inv /│   │ pdf: text layer  │   │ carton-range  │   │ discrepancy flags; │   │ list / commit_   │   │ boxes/box_      │
│ (worker)    │   │  other           │   │  → LLM fallback  │   │ expansion     │   │ approve/reject     │   │ vendor_invoice   │   │ contents ↔ lot  │
└─────────────┘   │ route: LAX/SFO=  │   │ (Claude, strict  │   │ arithmetic    │   │ (F18: override on  │   │ (audit_log,      │   │ ↔ PO (3-way)    │
                  │  warehouse;      │   │  JSON schema)    │   │ validators    │   │  almost everything)│   │  idempotent)     │   └─────────────────┘
                  │  ORD/HNL=direct  │   └──────────────────┘   └───────────────┘   └────────────────────┘   └──────────────────┘
                  │  (F12)           │
                  └──────────────────┘
```

Status enum on `ingest_documents`: `received → classified → parsing → parsed → needs_review → approved → committed`, plus terminal `rejected` and `failed` (retryable; DLQ after N attempts per RULES §2.3). **There is no path from `parsed` to `committed` that skips `needs_review`/`approved` — auto-commit is forbidden regardless of confidence (F18, project scope rule).** For a clean deterministic XLSX with zero flags, the review screen is a one-click confirm — still a human click.

### 1.2 Intake

**A. Upload UI** (`apps/web/src/app/mana/ingest/page.tsx`, new): drag-drop accepting `.xlsx .xls .csv .pdf`. POSTs the file to `POST /api/ingest/documents` (Next route handler, authenticated, role `operations|finance|admin`). Handler: type-check (magic bytes, not just extension — RULES §6), compute `sha256`, store to Supabase Storage bucket `vendor-docs/{yyyy}/{mm}/{sha256}-{filename}` (S3-compatible per RULES §2.1; interface kept swappable to DO Spaces), insert `ingest_documents` row (`source='upload'`, `status='received'`), enqueue `classify` job. Duplicate `sha256` → 409 returning the existing document id (idempotency).

**B. Gmail attachment pull** (NestJS worker): BullMQ repeatable job `gmail-poll` every 2 min. `googleapis` npm, OAuth2 client hydrated from `integration_tokens` (provider `gmail`; refresh handled by the worker, tokens never leave the server — RLS already denies all). Incremental sync via `users.history.list` with the last stored `historyId` (fall back to `users.messages.list` `q="has:attachment newer_than:2d"` on 404 historyId expiry). For each message with an xlsx/pdf attachment: upsert `vendor_emails` (unique `gmail_message_id` = idempotency key), resolve `vendor_id` by sender address → `vendors.contact_email`, download each attachment → same storage path scheme → one `ingest_documents` row per attachment (`source='gmail'`, `vendor_email_id` FK). Notification (`notif_type='receiving'`) to ops/finance: "2 documents from Pacific Blue Co. awaiting review."

### 1.3 Classify (worker job `classify`)

Three independent determinations, each overridable in review:

1. **Route (F12/F13):** filename token scan, word-boundary aware:
   `/(^|[^A-Z])(LAX|SFX|SFO)([^A-Z]|$)/i` → `warehouse`; `/(^|[^A-Z])(ORD|HNL)([^A-Z]|$)/i` → `direct`; both/neither → `unknown` (reviewer must pick — never guess). Persist matched token for the audit trail.
2. **Doc kind:**
   - XLSX/CSV: read header row(s) with SheetJS; score token overlap against two signature sets — packing list `{box no, box type, gel ice, grade, net.kg, unit/box, total lbs}` (F10) vs invoice `{invoice, awb, terms, carton, quantity, pieces, unit price, amount, total, sold to, shipment from}` (F8) — plus the vendor's own `vendor_mappings` columns. Highest score wins; ties → `unknown`.
   - PDF: extract text layer (see §2.3); same keyword scoring on first-page text. Empty text layer (scan) → single Claude classification call (same request shape as §2.4, tiny schema `{doc_kind, route, vendor_name_guess, confidence}`).
3. **Vendor:** gmail sender → `vendors.contact_email`; else filename/letterhead fuzzy match against `vendors.name/code`; else null → reviewer selects (required before parse can use a mapping).

Write `doc_kind`, `route`, `classify_confidence`, `vendor_id`; status `classified`; enqueue `parse-xlsx` or `parse-pdf`.

**Direct-shipment behavior (F13/F14/F15):** `route='direct'` documents still flow the full pipeline, but `commit` for their packing data does **not** create warehouse inventory (no available boxes on the allocation board). It creates a lot with a new status `in_transit_direct` (or reuses `shipped` — decide in migration review; I recommend a dedicated status to keep availability views clean — note `availability_by_species` already filters by status text so a new enum value is safe). The vendor invoice commit additionally enqueues a `draft-customer-reinvoice` job: build an AR `invoices` draft with a **new invoice number, same box numbers/items, marked-up rates** from `pricing_tiers`/`price_overrides` (F15, F6) — draft only, finance edits rates in the existing finance queue before QBO sync. The vendor's invoice is never forwarded (F15).

### 1.4 Parse / Normalize / Review / Commit — summarized here, detailed in §2–§4

- **Parse** produces `raw_extraction jsonb` (engine-faithful, un-normalized) + `parse_engine` (`sheetjs | pdf-text | llm`) + per-field confidence.
- **Normalize** (pure functions in `packages/ingestion`, shared client/server): species-code translation via `vendor_species_codes`, kg→lb when `vendor_mappings.uom='kg'` (reuse the existing `KG_TO_LB = 2.20462` + round-to-0.1 convention), carton-range expansion (§3), date/currency coercion, arithmetic validators (§2.5). Produces `normalized jsonb` conforming to the canonical schemas in §2.2. Rows failing hard validation land in `normalized.quarantined[]` with reasons — never silently dropped (RULES §3.3, mirrors existing `skipped[]` UX).
- **Review** (`apps/web/src/app/mana/ingest/[id]/page.tsx`): side-by-side — left: original file (PDF viewer / rendered sheet grid); right: editable normalized form. Every field editable (F18). Edits write `review_overrides jsonb` entries `{path, from, to, by, at, reason}` — reason required (RULES §4). Confidence < 0.90 renders amber and must be explicitly confirmed or edited; discrepancy flags (§4) render as a blocking checklist each requiring "accept anyway (reason)" or "fix". Approve button → `POST /api/ingest/documents/:id/approve` (role-gated) → status `approved` → commit RPC called server-side with the **server-stored** normalized payload + overrides applied (never a client-supplied payload).
- **Commit** — two `security definer` RPCs (§6.4), each fully atomic, audit-logged, idempotent (re-invocation on an already-committed doc is a no-op returning the prior result).
- **Link** — matching engine (§4) runs automatically whenever both sides exist: on invoice commit it links to already-committed packing boxes; on packing commit it back-links any earlier-committed invoice for the same shipment (matched by vendor + AWB/date window + carton overlap). Links live in `invoice_line_boxes`; discrepancies in `ingest_flags`.

### 1.5 New schema (migration `supabase/migrations/20260707090001_ingestion.sql` — DDL sketch)

```sql
create type doc_kind   as enum ('packing_list','commercial_invoice','other','unknown');
create type doc_route  as enum ('warehouse','direct','unknown');
create type ingest_status as enum ('received','classified','parsing','parsed',
                                   'needs_review','approved','committed','rejected','failed');
alter type lot_status add value if not exists 'in_transit_direct';

create table public.ingest_documents (
  id                uuid primary key default gen_random_uuid(),
  source            text not null check (source in ('upload','gmail')),
  vendor_email_id   uuid references public.vendor_emails(id) on delete set null,
  vendor_id         uuid references public.vendors(id) on delete set null,
  filename          text not null,
  mime              text not null,
  storage_path      text not null,
  sha256            text unique not null,                -- intake idempotency
  doc_kind          doc_kind  not null default 'unknown',
  route             doc_route not null default 'unknown',
  route_token       text,                                -- 'LAX' etc, audit
  classify_confidence numeric(4,3),
  parse_engine      text check (parse_engine in ('sheetjs','pdf-text','llm')),
  parse_confidence  numeric(4,3),
  raw_extraction    jsonb,
  normalized        jsonb,
  review_overrides  jsonb not null default '[]',
  status            ingest_status not null default 'received',
  error             text,
  attempt_count     int not null default 0,
  reviewed_by       uuid references public.profiles(id),
  approved_at       timestamptz,
  committed_lot_id  uuid references public.lots(id),        -- packing list result
  committed_vendor_invoice_id uuid,                          -- FK added below
  created_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- AP side (F8, F19) — distinct from AR public.invoices
create table public.vendor_invoices (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid not null references public.vendors(id),
  invoice_no    text not null,
  invoice_date  date,
  terms         text,
  awb           text,                        -- F8
  ship_from     text,                        -- F2/F8 origin, e.g. 'Tahiti'
  sold_to       text,
  currency      text not null default 'USD',
  subtotal      numeric(12,2),
  total         numeric(12,2) not null,
  route         doc_route not null default 'warehouse',
  document_id   uuid references public.ingest_documents(id),
  ap_status     text not null default 'unpaid'
                check (ap_status in ('unpaid','scheduled','paid','disputed')),  -- F19
  qbo_bill_ref  text,                        -- F21: PO→Bill conversion target
  created_at    timestamptz not null default now(),
  unique (vendor_id, invoice_no)             -- duplicate-invoice guard (RULES §5)
);

create table public.vendor_invoice_lines (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid not null references public.vendor_invoices(id) on delete cascade,
  line_no        int not null,
  description    text,
  species        text,                       -- normalized via vendor_species_codes
  carton_ref_raw text,                       -- '5004, 5005-5009' verbatim (F9)
  cartons        text[] not null default '{}', -- expanded canonical labels
  qty_pieces     numeric(10,2),
  weight_lb      numeric(12,2),
  unit_price_lb  numeric(10,4),
  amount         numeric(12,2),
  po_id          uuid references public.purchase_orders(id), -- 3-way match anchor
  created_at     timestamptz not null default now()
);

alter table public.ingest_documents
  add constraint ingest_docs_vinv_fk
  foreign key (committed_vendor_invoice_id) references public.vendor_invoices(id);

-- invoice line ↔ our boxes (the LINK stage)
create table public.invoice_line_boxes (
  id              uuid primary key default gen_random_uuid(),
  invoice_line_id uuid not null references public.vendor_invoice_lines(id) on delete cascade,
  box_id          uuid references public.boxes(id) on delete set null,
  carton_label    text not null,             -- canonical label even when box_id null
  packing_weight_lb numeric(10,2),
  match_status    text not null default 'proposed'
                  check (match_status in ('proposed','confirmed','rejected')),
  unique (invoice_line_id, carton_label)
);

create table public.ingest_flags (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.ingest_documents(id) on delete cascade,
  code         text not null,                -- §4.3 enum
  severity     text not null check (severity in ('error','warn')),
  path         text,                         -- 'lines[3]' / 'lines[3].cartons[5006]'
  detail       jsonb not null default '{}',
  resolution   text,                         -- reviewer's 'accept anyway' reason
  resolved_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- vendor_mappings v2: per doc type + invoice fields + sheet/header metadata
alter table public.vendor_mappings
  drop constraint vendor_mappings_vendor_id_key,
  add column doc_type doc_kind not null default 'packing_list',
  add column sheet_name  text,
  add column header_row  int not null default 1,
  add column extra_cols  jsonb not null default '{}',
    -- packing list extras: {"box_type":"Box Type","gel_ice":"Gel Ice","unit_per_box":"Unit/Box"}   (F10)
    -- invoice cols:       {"carton":"Carton #","qty":"Quantity Pieces","lb":"LB",
    --                      "unit_price":"Unit Price (LB)","amount":"Amount","description":"Description"}  (F8)
  add column header_cells jsonb not null default '{}';
    -- invoice header metadata as absolute cell refs: {"invoice_no":"F3","date":"F4","terms":"F5",
    --                                                 "awb":"F6","ship_from":"B8","sold_to":"B4","total":"G40"}
alter table public.vendor_mappings add constraint vendor_mappings_vendor_doc_key unique (vendor_id, doc_type);

-- purchase_orders: fields finance actually keys (F22) so the 3-way match has a rate
alter table public.purchase_orders
  add column customer_id  uuid references public.customers(id),
  add column order_no     text,
  add column order_date   date,
  add column rate_per_lb  numeric(10,4),
  add column box_refs     text;              -- free text as entered today (F22)
```

RLS: staff-read on everything; write on `ingest_documents/flags` limited to `admin,operations,finance`; `vendor_invoices*` to `admin,finance`; commit RPCs are `security definer` with internal role checks (pattern copied from `lock_board`). Realtime: add `ingest_documents` to the publication so the review queue badge updates live.

---

## 2. Parsers

### 2.1 XLSX — deterministic (primary path)

**Library: SheetJS (`xlsx`), version 0.20.x installed from the official CDN tarball** — `pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. Do **not** use the npm-registry `xlsx@0.18.5`; it is stale and has known CVEs (prototype pollution/ReDoS). Alternative if the team prefers registry-only deps: `exceljs` (heavier, fine server-side, no browser preview parity). SheetJS is chosen because the same bundle runs in the browser (client preview) and Node (authoritative parse) — preserving the current UX where the drawer previews before anything is committed.

Flow (worker job `parse-xlsx`, and identically in browser for preview):

1. `XLSX.read(buf)`, pick `vendor_mappings.sheet_name` or first sheet; `sheet_to_json(ws, {header:1, raw:true, defval:''})`.
2. Locate header at `header_row` (auto-scan ±5 rows for the best mapping-column hit rate if exact row misses — vendors move headers).
3. **Packing list (F10):** exactly the existing `applyMapping` semantics generalized: for each row read `box_col/species_col/weight_col/grade_col` + `extra_cols` (box_type, gel_ice, unit_per_box, net_kg); group rows by box label → multi-species boxes (F1); translate species via `vendor_species_codes`; convert kg→lb if `uom='kg'`; quarantine rows missing box/species/positive-weight with row numbers (existing `skipped[]` behavior).
4. **Commercial invoice (F8):** read `header_cells` for invoice_no/date/terms/AWB/ship_from/sold_to/total (`ws['F3'].v` style); read line columns from `extra_cols`; stop at the totals row (first row where carton col empty and amount col equals running sum, or explicit `total` label). Keep `carton_ref_raw` verbatim; expansion happens in normalize (§3).
5. Confidence: 1.0 per field resolved through the mapping; 0 (and a flag) for any mapped column not found — same error UX as today's "Columns not found — check Admin → Vendor Mappings", now per-doc-type.

Admin screen change: Vendor Mappings gets a doc-type tab (packing list | commercial invoice) editing the new columns, plus a "test against last uploaded file" button that runs the shared parser and shows hit/miss per column.

### 2.2 Canonical normalized schemas (zod, in `packages/ingestion/src/schema.ts`)

Both parse engines and the review UI converge on these; the commit RPCs validate against JSON-schema equivalents:

```ts
export const PackingListDoc = z.object({
  vendor_id: z.string().uuid(),
  route: z.enum(['warehouse', 'direct', 'unknown']),
  origin: z.string().nullable(), // F2
  reference: z.string().nullable(), // AWB / shipment ref if present
  boxes: z.array(
    z.object({
      box_no: z.string(), // canonical carton label
      box_type: z.string().nullable(),
      gel_ice: z.string().nullable(),
      contents: z.array(
        z.object({
          // F1: same species split by grade = separate items
          species: z.string(),
          grade: z.string().nullable(),
          pieces: z.number().nullable(),
          weight_lb: z.number().positive(), // F3: per-item weight
          confidence: z.number().min(0).max(1),
        })
      ),
      total_lb: z.number().nullable(), // F3: box total, validator input
    })
  ),
  quarantined: z.array(z.object({ row: z.number(), reason: z.string() })),
});

export const CommercialInvoiceDoc = z.object({
  vendor_id: z.string().uuid(),
  invoice_no: z.string(),
  invoice_date: z.string().nullable(), // ISO
  terms: z.string().nullable(),
  awb: z.string().nullable(),
  ship_from: z.string().nullable(),
  sold_to: z.string().nullable(),
  lines: z.array(
    z.object({
      description: z.string(),
      species: z.string().nullable(),
      carton_ref_raw: z.string(), // F9 verbatim
      qty_pieces: z.number().nullable(),
      weight_lb: z.number().nullable(),
      unit_price_lb: z.number().nullable(),
      amount: z.number().nullable(),
      confidence: z.number().min(0).max(1),
    })
  ),
  total: z.number(),
});
```

### 2.3 PDF — text-layer extraction first (worker job `parse-pdf`)

**Library: `pdfjs-dist` (Mozilla pdf.js), run in the NestJS worker** (Node ≥18; use the legacy build `pdfjs-dist/legacy/build/pdf.mjs` server-side). Chosen over `pdf-parse` (unmaintained, loses positions) and `unpdf` (fine, but we need positioned items): `page.getTextContent()` yields items with `transform` x/y coordinates, which is what table reconstruction needs.

Algorithm:

1. Extract items per page; if total text length < ~50 chars/page → **scanned PDF, skip to LLM path** (§2.4 — Claude's PDF support processes page images natively, so no separate OCR/tesseract dependency).
2. Cluster items into rows by y (tolerance ~2pt), columns by x histogram (k-means on x-starts across the page); map columns to fields by matching header-row text against the vendor mapping's column names (same dictionary as XLSX — one mapping config serves both formats).
3. Emit the same raw shape as the XLSX parser with per-field confidence: 0.95 baseline for cells under an exactly-matched header, degraded to 0.7 when a cell was assigned by nearest-column fallback, 0.5 when a row's column count ≠ header count.
4. **Escalate to LLM** when: header match rate < 60%, >20% low-confidence cells, arithmetic validators fail wholesale, or text layer absent. Text-layer result is kept and shown to the reviewer alongside the LLM result when both ran (disagreement itself is a flag).

### 2.4 PDF — LLM structured extraction fallback

**Library: `@anthropic-ai/sdk` (official TypeScript SDK). Model: `claude-opus-4-8`.** Runs **only** in the NestJS worker (`ANTHROPIC_API_KEY` server-side; never from the browser or Next runtime). Pattern — PDF document block + structured outputs with a strict schema, via `messages.parse` + `zodOutputFormat`:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { CommercialInvoiceLLM } from '@mana/ingestion/schema'; // canonical schema minus vendor_id,
// plus per-field confidence + evidence

const client = new Anthropic();

const response = await client.messages.parse({
  model: 'claude-opus-4-8',
  max_tokens: 16000,
  thinking: { type: 'adaptive' },
  output_config: { format: zodOutputFormat(CommercialInvoiceLLM) },
  messages: [
    {
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
        { type: 'text', text: EXTRACTION_PROMPT }, // states F8/F10 field definitions, F9 carton formats,
        // "copy carton_ref_raw verbatim, do NOT expand ranges",
        // "weights: preserve units as printed; set uom field",
        // "confidence per field 0-1; null + 0 when absent"
      ],
    },
  ],
});
const doc = response.parsed_output; // null ⇒ parse failure ⇒ status 'failed', flag for manual entry
```

Design decisions:

- **Schema constraints:** all objects `additionalProperties: false`; enums for `doc_kind`/`uom`; the SDK strips zod numeric/string constraints unsupported by the API and re-validates client-side — keep min/max in zod anyway.
- **The model never expands carton ranges and never converts units** — `carton_ref_raw` verbatim and `uom` as printed; expansion/conversion happen deterministically in normalize so LLM output and XLSX output flow through identical, testable code.
- **Confidence:** model self-reports per field, then the worker **demotes** it with independent validators (§2.5) — self-reported confidence is never trusted alone. `parse_confidence = min(model_overall, validator_score)`.
- Limits: base64 PDFs up to 32 MB / hundreds of pages — far above any vendor invoice. One call per document; no batching needed at this volume (retry with SDK defaults; job-level retry per RULES §2.3 on 429/5xx).
- **NEVER auto-commit:** LLM output always lands as `needs_review` with the PDF rendered beside it. This is a hard rule (F18 + project scope), enforced structurally — the commit RPC refuses documents whose status isn't `approved` and whose `approved_at`/`reviewed_by` are null.

### 2.5 Cross-engine arithmetic validators (normalize stage, pure functions)

| Validator     | Rule                                                                                                                         | On fail                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Line math     | `qty_pieces? · unit_price_lb · —` n/a; primary: `weight_lb × unit_price_lb ≈ amount` (±$0.01·lines, cent-level per RULES §5) | flag `LINE_MATH_ERROR`, demote line confidence to ≤0.5                                       |
| Invoice total | `Σ lines.amount ≈ total` (±$0.01)                                                                                            | flag `TOTAL_MISMATCH` (severity error — blocks approve until edited or accepted-with-reason) |
| Box total     | `Σ contents.weight_lb ≈ total_lb` per box when both present (±0.2 lb)                                                        | flag `BOX_SUM_MISMATCH`                                                                      |
| UOM sanity    | if `Σ net weights / declared total ∈ [2.15, 2.26]` or `[0.44, 0.47]` → probable kg/lb inversion                              | flag `UOM_SUSPECT`                                                                           |
| Duplicate     | `(vendor_id, invoice_no)` already in `vendor_invoices`                                                                       | flag `DUPLICATE_INVOICE`, severity error                                                     |

---

## 3. Carton-range expander (F9)

`packages/ingestion/src/cartonRange.ts` — pure, exhaustively unit-tested, shared by normalize (server) and the review UI (live re-expansion as the reviewer edits `carton_ref_raw`).

### 3.1 Contract

```ts
export interface CartonExpansion {
  cartons: { label: string; tokenIdx: number }[]; // deduped, input order, source-token traceable
  warnings: string[]; // surfaced as review flags (severity warn)
  unparsed: string[]; // kept as literal labels, needs reviewer confirm
}
export function expandCartonRefs(raw: string, opts?: { rangeCap?: number }): CartonExpansion;
```

### 3.2 Algorithm

1. **Tokenize.** Normalize unicode dashes (`– — −`) and the words `to`/`thru`/`through` (surrounded by spaces) to `-`. Split on `,` `;` and newlines. Trim each token; drop empty tokens (handles `"5004, ,5012,"`, double commas, trailing commas).
2. **Per token, decide single vs range.** Apply regex `^(.*\d)\s*-\s*([A-Za-z#]*?)(\d+)$` (greedy left).
   - No match → **single**: parse with `^([A-Za-z#\- ]*?)(\d+)$` → `{prefix, digits}`; if that also fails (no digits at all, e.g. `"PALLET A"`), push the uppercased literal to `unparsed` + warning — **never dropped** (RULES §3.3).
   - Match → **range candidate** with left part `L`, right prefix `RP`, right digits `RD`. Parse `L` as `{LP, LD}` (prefix = everything before the trailing digit run). This disambiguation is load-bearing: it requires **digits on both sides of the dash**, so `"B-4471"` (left of the last dash is `"B"`, no digits) is a single label — matching our existing `boxes.label` format — while `"5005-5009"`, `"B4471-B4475"` and `"B-4471-B-4475"` (greedy left = `"B-4471"`) are ranges.
   - Prefix rule: `RP` must equal `LP` case-insensitively or be empty (inherits `LP`); mismatch (`"A5001-B5004"`) → treat as unparsed + warning `PREFIX_MISMATCH`.
3. **Suffix shorthand.** If `int(RD) < int(LD)` **and** `len(RD) < len(LD)`: interpret `RD` as replacing the last `len(RD)` digits of `LD` (`"5005-9"` → 5005–5009, `"5005-09"` → 5005–5009, `"5098-102"` → invalid: 5098→5102 via replace last 3 → 5102 ✓). If the result ≥ start, use it with warning `SHORTHAND_EXPANDED`; else fall through to 4.
4. **Descending.** If end < start after step 3 (`"5009-5005"`): swap, warning `DESCENDING_RANGE_SWAPPED`.
5. **Span cap.** If `end − start + 1 > rangeCap` (default **1000**): do not expand; move the token to `unparsed` with warning `RANGE_TOO_LARGE` (almost certainly a typo like `"5005-50009"` — force human action, don't create 45k boxes).
6. **Emit.** For each `n` in `[start..end]`: `label = LP.toUpperCase().replace(/\s+/g,'') + pad(n)`, where `pad` zero-pads to `len(LD)` only when `LD` starts with `'0'` (preserves `"0004-0009"` → `0004…0009`; plain `"5004"` stays unpadded even when n gains a digit, e.g. `"98-102"` → `98,99,100,101,102`).
7. **Dedupe with warning.** A `Set` of labels; re-emission from a later token (`"5004, 5004-5006"` re-covers 5004) is skipped with warning `DUPLICATE_COVERAGE(5004)`. First occurrence's `tokenIdx` wins (matters for per-line weight apportionment when two invoice lines claim the same carton — that cross-line case is flag `OVERLAPPING_CARTON` in §4, legitimate for mixed boxes F1).

### 3.3 Edge-case truth table (unit tests)

| Input                                      | Output                             | Warnings                 |
| ------------------------------------------ | ---------------------------------- | ------------------------ |
| `"5004, 5005-5009, 5012"`                  | 5004,5005,5006,5007,5008,5009,5012 | —                        |
| `"5004 ,5005 - 5009"` (spaces)             | 5004,5005…5009                     | —                        |
| `"5005–5009"` (en dash) / `"5005 to 5009"` | 5005…5009                          | —                        |
| `"5009-5005"`                              | 5005…5009                          | DESCENDING_RANGE_SWAPPED |
| `"5005-9"`                                 | 5005…5009                          | SHORTHAND_EXPANDED       |
| `"B-4471"`                                 | B-4471 (single)                    | —                        |
| `"B4471-B4475"` / `"B-4471-B-4475"`        | B4471…B4475 / B-4471…B-4475        | —                        |
| `"A5001-B5004"`                            | → unparsed                         | PREFIX_MISMATCH          |
| `"5004, 5004-5006"`                        | 5004,5005,5006                     | DUPLICATE_COVERAGE(5004) |
| `"0004-0009"`                              | 0004,0005…0009 (padded)            | —                        |
| `"5005-50009"`                             | → unparsed                         | RANGE_TOO_LARGE          |
| `"PALLET A"`                               | → unparsed literal `PALLET A`      | UNPARSED_TOKEN           |
| `""` / `",,"`                              | empty                              | —                        |

---

## 4. Matching engine — invoice lines ↔ packing boxes ↔ our boxes ↔ PO (three-way match)

Worker job `match`, triggered post-commit of either document type; results persisted to `invoice_line_boxes` + `ingest_flags`; all matches land as `proposed` — reviewer confirms/rejects on a reconciliation screen (extends the existing vendor-reconciliation page family).

### 4.1 Canonical key

`canon(label) = upper(trim(label)).replace(/\s+/g,'')` — applied identically at packing-list commit (`boxes.label`), carton expansion output, and match time. Within a shipment scope: `(vendor_id, lot_id)` for packing↔our-boxes (they're created from the same doc, so this is exact by construction); `(vendor_id, AWB)` else `(vendor_id, invoice_date ± 7d)` for invoice↔packing candidate scoping.

### 4.2 Passes

1. **Expand** each invoice line's `carton_ref_raw` (§3) → carton set `C_i`.
2. **Exact carton match:** for each carton in `C_i`, find `boxes.label = canon(carton)` in candidate lots. Found → `invoice_line_boxes(proposed)` with `packing_weight_lb = Σ box_contents.weight` (species-filtered when line species known — a mixed box F1 can legitimately serve two invoice lines).
3. **Weight reconciliation per line:** `expected = Σ matched packing weights (+ equal apportionment of line weight across unmatched cartons for the check only)`. Tolerance: `|line.weight_lb − expected| ≤ max(1.0 lb, 2% · line.weight_lb)` — both constants in a new `ingest_settings` table, overridable per vendor.
4. **Price / PO (three-way, F20–F22):** resolve PO by explicit reviewer link, else `(vendor_id, species, expected_at window, status in open/partial)`. Compare `line.unit_price_lb` vs `purchase_orders.rate_per_lb`: variance flag when `|Δ| > max($0.05, 2%)`. Quantity leg: Σ invoice lb per PO vs `expected_lb` (flag `PO_QTY_VARIANCE` beyond 5%). PO↔packing leg: lot total lb vs `expected_lb` (same tolerance). A fully green three-way match is the precondition badge for "convert to QBO Bill" later (F21/F23 — the `billable` investigation and the bulk-PO-import tool replacement both hang off `vendor_invoices` + `purchase_orders`, out of scope here but the data shape is ready).

### 4.3 Discrepancy flag codes

| Code                                                                                                           | Meaning                                                                                                                                                                                            | Severity |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `MISSING_BOX`                                                                                                  | invoice carton with no packing/our box (F14 direct shipments commonly: no packing list at all → suppressed when route='direct' and no packing doc exists; instead informational `NO_PACKING_LIST`) | error    |
| `EXTRA_BOX`                                                                                                    | packing/our box not covered by any invoice line                                                                                                                                                    | warn     |
| `WEIGHT_MISMATCH`                                                                                              | per-line tolerance breach (pass 3)                                                                                                                                                                 | error    |
| `PRICE_VARIANCE`                                                                                               | invoice rate vs PO rate breach                                                                                                                                                                     | error    |
| `PO_QTY_VARIANCE` / `NO_PO`                                                                                    | quantity leg breach / no PO resolvable                                                                                                                                                             | warn     |
| `OVERLAPPING_CARTON`                                                                                           | same carton claimed by ≥2 invoice lines of the **same** species (mixed-species overlap is legitimate, F1)                                                                                          | warn     |
| `LINE_MATH_ERROR`, `TOTAL_MISMATCH`, `BOX_SUM_MISMATCH`, `UOM_SUSPECT`, `DUPLICATE_INVOICE`, `UNKNOWN_SPECIES` | from §2.5 / normalize                                                                                                                                                                              | per §2.5 |

Every `error` flag must be resolved (fixed or accepted-with-reason) before the reconciliation is markable "matched"; nothing auto-resolves.

---

## 5. Google Sheets replacement — alternatives, honestly compared (F18)

Context: the Sheets are used for **allocation only** (one page per customer + an inventory page, F16); direct shipments never enter them (F13); QBO already decrements its own inventory on "turn to bill" (F17). RULES §3.1 _requires_ Sheets to remain transitional source of truth with parity reports until cutover — so (b) is not a competitor to (a); it's the mandated bridge.

| Option                                        | What it is                                                                                                                                             | Pros                                                                                                                                                                                          | Cons                                                                                                                                                                                                                                                                                                                | Verdict                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Full ingestion path** (this doc)        | Packing list + commercial invoice parsed into lots/boxes/AP, allocation board replaces sheets                                                          | Single source of truth; feeds allocation, AP (F19), three-way match, QBO deeply (F18); manual override everywhere; direct shipments finally captured (they're invisible in Sheets today, F13) | Highest build cost; parser wrong-ness risk (mitigated: mandatory review, deterministic-first); vendors' file chaos is ongoing ops load                                                                                                                                                                              | **Recommended end-state.**                                                                                                                    |
| **(b) Google Sheets API sync (transitional)** | Worker job reads their existing sheets read-only via Sheets API; produces parity report ERP-vs-Sheet (lot/box/weight/allocation counts per RULES §3.2) | Cheap; de-risks cutover; catches parser gaps against ground truth; zero behavior change for staff                                                                                             | Not a destination: sheet structure is per-customer freeform, no box-level integrity, no AP, silently drifts; two-way sync would be a correctness nightmare — **read-only only**                                                                                                                                     | **Do it, as the parity/QA harness for phase 3, then delete it.**                                                                              |
| **(c) Vendor portal direct entry**            | Vendors key packing data into a hosted form                                                                                                            | Perfect structure, no parsing                                                                                                                                                                 | Adoption risk is decisive: vendors already barely send consistent files; some don't send packing lists at all (F14); adds vendor support burden. F11 hints EOF authored the packing template — the cheap 80% of this option is **standardizing that template** so the deterministic parser hit-rate approaches 100% | Not now. Revisit per-vendor after (a) proves which vendors are chronically manual. First step regardless: confirm F11 and ship a v2 template. |
| **(d) Email-only ingestion**                  | No upload UI; Gmail pull is the sole intake                                                                                                            | Matches real behavior (docs arrive by email); least UI                                                                                                                                        | It's a **subset of (a)**, not an alternative — same parsers/review/commit; loses the manual re-upload path (corrected files, WhatsApp'd PDFs, phone-ins) which F18's override culture demands                                                                                                                       | Rejected as sole channel; shipped as the second intake of (a).                                                                                |

**Migration path (maps to RULES §1.1 phases):**

1. **Now (Phase 2 tail):** ship §1–§4 with upload intake only; deterministic XLSX first, per-vendor mappings seeded from real files; PDF/LLM behind the same review screen. Staff double-enter into Sheets (unchanged).
2. **Phase 3:** add Gmail intake + (b) parity job; weekly parity report (row counts, total lb per species/lot, allocation deltas — logged per RULES §3.2). Run ≥2 clean weeks. Sheets become read-only mirrors for allocation viewing; allocation board is authoritative.
3. **Phase 4:** vendor_invoices → QBO Bill sync (replaces the **paid** bulk-PO-import tool, F20 — direct cost saving to headline), three-way-match badge gates Bill creation, AP aging view (F19). Investigate QBO `billable` flag (F23) here.
4. **Cutover:** Sheets frozen read-only (RULES §3.1 post-cutover). Direct-shipment re-invoice drafts (F15) fully in-system.
5. **Later, optional:** per-vendor portal/template hardening (c) for the worst-file vendors.

---

## 6. Placement map — what runs where (repo architecture rules)

| Component                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Runs in                                                              | Why / rules                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File picker, XLSX/CSV **preview** parse (SheetJS in browser), carton-expander live preview, review screen, mapping admin                                                                                                                                                                                                                                                                                                                                               | **Client** (`apps/web/src/app/mana/ingest/*`)                        | Mirrors existing inventory-import UX; preview is advisory only — the committed payload is always the server-stored parse + overrides. No business rules trusted client-side (RULES §2.2).                                                                                                                                                                                                            |
| `POST /api/ingest/documents` (upload → storage + row + enqueue), `POST /api/ingest/documents/:id/approve` (RBAC check → apply overrides → call commit RPC with service-role client), `POST /:id/reject`, mapping CRUD                                                                                                                                                                                                                                                  | **Next route handlers** (`apps/web/src/app/api/ingest/*`)            | Privileged writes need the service role / RPC; RBAC enforced server-side per request (RULES §2.2, §6). Handlers stay thin — no parsing, no long work.                                                                                                                                                                                                                                                |
| Gmail polling (cron), classification, authoritative XLSX re-parse, PDF text-layer parse (`pdfjs-dist`), **Claude structured extraction** (`@anthropic-ai/sdk`, `claude-opus-4-8`), matching engine, parity-report job (option b), re-invoice draft job (F15), later QBO Bill sync                                                                                                                                                                                      | **NestJS worker** (`apps/api`) with **BullMQ + Redis**               | RULES §2.3 explicitly lists email/BOL parsing + QBO/Sheets sync as background jobs; every job gets job-id, idempotency key (`sha256` / `gmail_message_id` / `document_id+stage`), status on `ingest_documents.status`, exponential retry, `failed` state visible in an admin "Ingestion jobs" panel. Secrets (`ANTHROPIC_API_KEY`, Google OAuth, service-role key) live only here + Next server env. |
| `commit_packing_list(p_document_id uuid)` — creates lot (`incoming` when PO says pre-arrival / `in_transit_direct` when route=direct / else `received`), boxes (label = canonical carton no), box_contents (species/grade/weight per F1/F3), links `purchase_orders.lot_id`, stamps `committed_lot_id`, audit_log; `commit_vendor_invoice(p_document_id uuid)` — vendor_invoices + lines (expanded cartons), duplicate guard, proposed `invoice_line_boxes`, audit_log | **Postgres RPCs** (`security definer`, same pattern as `lock_board`) | Atomicity + double-import prevention must live in the DB (RULES §4/§5 analogues): status-guard (`approved` only), idempotent re-call (returns prior result if `committed_*` set), unique constraints (`sha256`, `(vendor_id,invoice_no)`, `(lot_id,label)`) as the last line of defense.                                                                                                             |
| Shared parser/normalizer/expander/zod schemas                                                                                                                                                                                                                                                                                                                                                                                                                          | **`packages/ingestion`**                                             | One code path for browser preview, worker authoritative parse, and unit tests — divergence between preview and commit is the classic silent-corruption bug; this kills it.                                                                                                                                                                                                                           |

**Key files to create:** `packages/ingestion/src/{schema.ts, applyMapping.ts, cartonRange.ts, validators.ts, normalize.ts}` · `apps/api/src/ingest/{gmail.poller.ts, classify.processor.ts, parseXlsx.processor.ts, parsePdf.processor.ts, llmExtract.service.ts, match.processor.ts, queues.module.ts}` · `apps/web/src/app/api/ingest/{documents/route.ts, documents/[id]/approve/route.ts}` · `apps/web/src/app/mana/ingest/{page.tsx, [id]/page.tsx}` · `supabase/migrations/20260707090001_ingestion.sql`.

**Open questions for the analyst to confirm before build:** (1) F11 — is the packing list an EOF-authored template? If yes, version it and pin the deterministic parser to it. (2) EOF product code + written selling price on invoices (F5/F6) — add `entity ('MANA'|'EOF')` + `eof_product_code` + `listed_sell_price` columns to `vendor_invoice_lines` if the sample files confirm; the PO-column-empty ⇒ MANA rule (F5) belongs in classify. (3) Trucker/customer/pickup-datetime per box (F4) live on the _outbound_ side — out of ingestion scope, but reserve `boxes` extension or a `shipments` table in the logistics phase. (4) Confirm the `in_transit_direct` lot status vs reusing `shipped` with the ops lead.
