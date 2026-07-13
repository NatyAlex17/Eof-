# MANA — Delivered This Cycle (July)

Record of what was built and wired to the live Supabase backend in this cycle, beyond the
schema-v1/v2 + demo-UI baseline. Everything below is UI + backend integrated (no email or
spreadsheet integrations yet). Companion to `MANA_Master_Task_List.md`.

## Roles & access

- **Roles registry** — `roles` table + `add_role()` RPC; admin can add custom roles from the UI.
  Six built-in roles seeded; `customer` and `vendor` added as external roles.
- **Admin "Add user"** — generates a first password (copyable), creates a confirmed account, assigns role.
- **Settings / password** — every signed-in user (staff, customer, vendor) can change their own password.
- **Nav shows the real signed-in user** (name, role, initials).

## Order intake & orders (DB-wired)

- **Order intake writes real orders** — customers/SKUs/tiers/overrides loaded from DB; creates
  `orders` + `order_lines`; new-customer path inserts a customer.
- **Species + grade** — orders are placed at the SKU (species **and** grade) level; schema fix C2 applied
  (`order_lines` unique on `(order_id, species, grade)`), so the same species can be ordered at two grades.
- **Delivery vs pickup** — order carries `freight_mode` (`delivery`/`customer_pickup`); staff enter a
  **transport fee** for delivery orders (`orders.transport_fee`), shown on the Orders page.
- **Warehouse / direct routing** — Orders page: assign SFO/LAX (to the board) or mark ORD/HNL **direct**;
  a "warehouse unassigned" filter surfaces customer orders that still need routing.
- **Orders page reads the DB** (central record) with delivery address/contact + transport fee shown.

## Customers

- **Customers page on DB** — CRUD against `customers` (+ `price_overrides`); filters for new-this-week,
  unassigned tier, tier/status/warehouse, sort.
- **Tier assignment** — admin/operations/sales/finance can set a customer's tier; new self-signups start
  with **no tier** and see no pricing until one is assigned.

## Customer portal (`/portal`, `customer` role)

- Self-signup (`/signup`) → active account, role-routed login, middleware isolation.
- Dashboard, **place order** (their tier price, delivery/pickup, address), order history/status,
  **price sheet** (their tier only — hidden until a tier is assigned: "prices will be listed shortly"),
  invoices, **quality/downgrade claims**, settings.
- All data RLS-scoped to their own customer; never sees other customers, cost, margin, vendors, or the board.

## Vendor portal (`/vendor`, `vendor` role)

- Self-signup (`/vendor-signup`) → **pending verification**; role-routed login, middleware isolation.
- **Verification gate** — a vendor cannot submit anything until staff verify them (enforced in RLS, not
  just UI). Status shown visually in the sidebar, dashboard, and submit page.
- **Submit packing list = structured form** (no file parsing): destination + per-box lines
  (box #, species, grade, weight lb, pieces, box type) → written to `documents.parsed_payload`.
  Vendors **no longer submit invoices** — the system generates them.
- Dashboard, my documents (parse-status lifecycle), shipments & lots (read-only), settlements, settings.
- RLS-scoped to their own vendor; never sees revenue, sell prices, margin, customer names, or other vendors.

## Staff — vendor verification & documents

- **Vendor Verification** page (`/mana/vendor-verification`) — approve / reject (with reason) pending vendors.
- **Documents Inbox** (`/mana/documents`) — vendor submissions land here; staff review the structured
  lines, then **create the shipment** (AWB, origin, destination, ETA, routing) — which is the owner/staff
  responsibility, not the vendor's. Creating marks the document processed and links it.
- **Generated commercial invoice / packing list** (`/mana/documents/[id]/invoice`) — professional,
  watermarked, print-to-PDF document built from the vendor's structured packing data.

## Security (RLS)

- External-role isolation helpers: `app_customer_id()`, `app_vendor_id()`, `app_vendor_verified()`.
- Closed the schema-v3 `using(true)` read leaks: documents, shipments, vendor invoices, AP, PO lines,
  invoice lines, entity codes are now staff-only; customers/vendors are denied by default and granted only
  their own scoped rows.
- Private `vendor-docs` storage bucket (vendor writes only into their own folder; staff read all).

## Migrations added this cycle (run in order, after schema v1/v2 + sku_pricing + v3)

`20260710100001_roles.sql` · `…100002_order_lines_grade.sql` · `…100003_customer_portal.sql` ·
`…100004_customer_tier_optional.sql` · `…100005_order_delivery.sql` · `…100006_transport_fee.sql` ·
`20260711100001_vendor_portal.sql` · `…100002_vendor_verification.sql` · `…100003_vendor_packing_form.sql`
(Dev B's `20260710120001_schema_v3_new_tables.sql` sits between the two dates.)

## Still not done (interim notes)

- Allocation board is still demo data (not yet wired to `box_contents`).
- Documents Inbox is the **interim manual** path — no automated parsing pipeline; staff key the shipment
  header from the vendor's structured lines. Full parse/match/commit is Dev B's ingestion sprint.
- QBO / Gmail / Main Freight integrations not started.
- Generated document shows weights/pieces (no sell prices — vendors never see pricing). A priced AR
  commercial invoice from order/invoice data is a separate future document.
