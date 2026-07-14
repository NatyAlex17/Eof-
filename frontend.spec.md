# Frontend Specification — EOF/Mana ERP Platform

**Project**: EOF Mana ERP Modernization  
**Framework**: Next.js 16 + React 19  
**Styling**: Tailwind CSS v4 + PostCSS  
**Database Client**: Supabase (PostgreSQL)  
**Package Manager**: pnpm v9  
**Type System**: TypeScript v5.5  
**Last Updated**: 2026-07-15

---

## 1. Project Overview

The **Mana Operations Platform** is an ERP modernization system replacing fragmented spreadsheet-driven workflows at EOF/Mana operations. The platform consolidates inventory management, order processing, allocation, logistics, finance, reconciliation, and executive dashboards into a centralized web application.

### Key Objectives

- Replace spreadsheet workflows with centralized ERP platform
- Support multi-user concurrent operations with real-time sync
- Integrate with external systems: QuickBooks Online, HubSpot, SendGrid, Twilio, 3PL providers
- Maintain audit trails and compliance requirements
- Enable role-based access for Admin, Customer, and Vendor portals

---

## 2. Architecture Overview

### 2.1 Monorepo Structure

```
EOF_main/
├── apps/
│   ├── web/              # Next.js frontend (port 3000)
│   └── api/              # NestJS backend (port 4000)
├── packages/
│   ├── shared/           # Shared TypeScript types & utilities
│   └── config/           # Shared ESLint, Prettier config
├── supabase/             # Database migrations & seed scripts
└── [config files]        # Turbo, ESLint, Prettier, Husky
```

### 2.2 Build System

- **Turbo**: Monorepo task orchestration (v2.0.0)
- **Next.js**: App Router with Turbopack bundler
- **TypeScript**: Strict mode with path aliases (@web/_, @api/_, @shared/\*)

### 2.3 Data Layer Architecture

```
Frontend (Next.js)
    ↓
Supabase Client (browser & server)
    ↓
PostgreSQL (Supabase-hosted)
    ↓
[Future] NestJS API (passthrough layer for auth, external integrations)
```

Current approach: **Direct Supabase client** from frontend. Future architecture will route through NestJS for centralized business logic and external integrations.

---

## 3. Tech Stack Details

### Core Dependencies

```json
{
  "next": "16.2.7",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "@supabase/ssr": "^0.12.0",
  "@supabase/supabase-js": "^2.109.0",
  "tailwindcss": "^4",
  "@tailwindcss/postcss": "^4"
}
```

### Dev Dependencies

```json
{
  "typescript": "^5",
  "eslint": "^9",
  "eslint-config-next": "16.2.7",
  "eslint-plugin-react": "^7.37.5",
  "@types/react": "^19",
  "@types/react-dom": "^19"
}
```

### Optional Utilities

- `html2canvas` v1.4.1 — Client-side screenshot/PDF generation (pick slips, invoices)
- `jspdf` v4.2.1 — PDF document generation

---

## 4. Directory Structure

### 4.1 app/ (Next.js App Router)

```
src/app/
├── page.tsx                    # Home → redirects to /mana
├── layout.tsx                  # Root layout (fonts, CSS reset)
├── globals.css                 # Tailwind + custom global styles
├── favicon.ico
│
├── login/
│   └── page.tsx               # Auth entry point
│
├── signup/
│   └── page.tsx               # Public signup
│
├── vendor-signup/
│   └── page.tsx               # Vendor onboarding
│
├── mana/                       # ADMIN PORTAL (protected)
│   ├── page.tsx               # Root → /allocation-board
│   ├── layout.tsx             # Mana-specific fonts & styles
│   ├── mana-styles.css
│   │
│   ├── allocation-board/      # Inventory → Orders drag-drop
│   ├── order-intake/          # Fast phone order entry (COMPLETE)
│   ├── order-inbox/           # Order queue review
│   ├── inventory/             # Lot & box management
│   ├── pick-slips/            # Print-ready picking docs
│   │
│   ├── finance-queue/         # Invoices + credit claims
│   ├── vendor-reconciliation/ # Vendor settlements
│   ├── credits/               # Quality downgrades & credits
│   │
│   ├── ceo-dashboard/         # KPI cards + charts
│   ├── finance-dashboard/     # Revenue, margin, receivables
│   ├── operations-dashboard/  # Throughput, allocation, fulfillment
│   │
│   ├── admin/                 # Settings, users, roles
│   ├── customers/             # Customer directory
│   ├── documents/             # Document management
│   ├── notifications/         # Alert center
│   ├── price-sheet/           # Pricing management
│   ├── purchase-orders/       # Vendor POs
│   ├── settings/              # User profile
│   ├── vendor-verification/   # Vendor onboarding review
│   │
│   └── components/            # Mana-wide reusable components
│
├── portal/                     # CUSTOMER PORTAL (protected)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── portalData.ts
│   ├── orders/
│   ├── order/
│   ├── invoices/
│   ├── claims/
│   ├── price-sheet/
│   ├── settings/
│   └── components/
│
├── vendor/                     # VENDOR PORTAL (protected)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── vendorData.ts
│   ├── shipments/
│   ├── documents/
│   ├── settlements/
│   ├── upload/
│   ├── settings/
│   └── components/
│
└── api/                        # Route handlers (auth, webhooks)
    ├── admin/
    ├── portal/
    └── vendor/
```

### 4.2 lib/ (Utilities & Data Layer)

```
src/lib/
├── supabase/
│   ├── client.ts              # Browser client (with auth)
│   └── server.ts              # Server-side client (cookies)
│
├── data/
│   ├── index.ts               # Export barrel
│   ├── types.ts               # Domain row types from DB schema
│   ├── queries.ts             # SELECT operations (RLS enforced)
│   ├── mutations.ts           # INSERT/UPDATE/DELETE (RLS enforced)
│   └── realtime.ts            # Subscriptions for live updates
│
├── database.types.ts          # Auto-generated by Supabase CLI
│                              # → Import row types from data/types.ts
│
└── pickSlipGenerator.ts       # PDF generation utility
```

### 4.3 types/

```
src/types/
└── allocation.ts              # Domain-specific types (allocation, scenarios)
```

### 4.4 middleware.ts

```
src/middleware.ts              # Auth redirect, session handling
                               # → Protects /mana, /portal, /vendor routes
```

---

## 5. Database Schema & Types

### 5.1 Core Entities

Managed in Supabase PostgreSQL via migrations. Source of truth is the database schema.

**Profiles & Auth**

- `profiles` — User accounts (email, role, tier)
- `vendors` — Supplier directory
- `customers` — Buyer directory with tier assignments

**Inventory**

- `skus` — Product SKUs (species × grade combinations)
- `pricing_tiers` — Customer tier pricing (retail, wholesale, etc.)
- `price_overrides` — Per-customer price adjustments
- `lots` — Incoming inventory shipments (from vendors)
- `boxes` — Physical box-level tracking
- `box_contents` — Species/grade per box

**Orders**

- `orders` — Customer sales orders
- `order_lines` — Line items (species, qty, grade)
- `standing_orders` — Recurring customer orders

**Finance**

- `invoices` — Sales invoices (linked to orders)
- `credit_claims` — Quality downgrades & refund requests
- `downgrades` — Grade drop reasons & credit amounts
- `vendor_statements` — Settlement documents (to vendors)

**Logistics**

- `pick_slips` — Print-ready picking documents
- `shipments` — Outbound shipment tracking
- `vendor_shipments` — Inbound vendor shipments

**Admin**

- `vendor_mappings` — Vendor ↔ customer relationships
- `vendor_species_codes` — Vendor's internal SKU codes
- `entity_codes` — Organization/warehouse codes
- `notifications` — Alert/message queue

### 5.2 Views (Read-Only)

- `order_lines_with_fulfillment` — Line item + fulfillment status
- `orders_with_fulfillment` — Order + aggregate fulfillment
- `availability_by_species` — Inventory summary by species/grade

### 5.3 Type Exports

All row types are exported from `src/lib/data/types.ts`:

```typescript
// Import from here, never redeclare manually
import type { Order, OrderLine, Box, Lot, LotTree } from '@web/lib/data/types';

// Compound types
export type LotTree = Lot & {
  vendors: Pick<Vendor, 'name'> | null;
  boxes: Array<Box & { box_contents: BoxContent[] }>;
};
```

---

## 6. Development Setup

### 6.1 Prerequisites

- Node.js v18+ (check `.nvmrc` if present)
- pnpm v9.0.0
- Docker + Docker Compose (for local database)
- Supabase CLI (optional, for migrations)

### 6.2 Local Environment

```bash
# 1. Clone & install
git clone <repo>
cd EOF_main
pnpm install

# 2. Copy environment
cp .env.example .env

# Fill in:
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://...  # For API (optional, data lives in Supabase)
```

### 6.3 Start Dependencies & Apps

```bash
# Terminal 1: Database (if using local Postgres)
docker compose up postgres

# Terminal 2: Frontend dev server
pnpm dev:web                    # → http://localhost:3000

# Terminal 3: API (when ready)
pnpm dev:api                    # → http://localhost:4000
```

### 6.4 Useful Commands

```bash
pnpm dev              # Start all apps (Turbo)
pnpm build            # Build all apps
pnpm lint             # Lint all apps
pnpm lint:fix         # Auto-fix linting issues
pnpm format           # Prettier format all files
pnpm test             # Run all tests
```

---

## 7. Code Patterns & Conventions

### 7.1 TypeScript Setup

- **Strict mode**: Enabled globally in `tsconfig.base.json`
- **Path aliases**:
  - `@web/*` → `apps/web/src/*`
  - `@api/*` → `apps/api/src/*`
  - `@shared/*` → `packages/shared/src/*`

### 7.2 Component Patterns

**Server Components** (Default in Next.js App Router)

```typescript
// ✅ Preferred for data fetching, no JavaScript shipped
export default async function OrdersPage() {
  const orders = await fetchOrders();
  return <OrderList orders={orders} />;
}
```

**Client Components** (When state/interactivity needed)

```typescript
'use client';
import { useState } from 'react';

export default function InteractiveForm() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

### 7.3 Styling

- **Tailwind CSS v4**: Utility-first CSS with PostCSS
- **Custom fonts**: Per-portal (Archivo for Mana, custom for others)
- **Print styles**: Dedicated `@media print` rules for pick slips, invoices
- **No CSS modules** unless print layout requires it

```css
/* mana-styles.css example */
@media print {
  .no-print {
    display: none;
  }
  .pick-slip-page {
    page-break-after: always;
  }
}
```

### 7.4 Data Fetching

**Queries** (Read-only, RLS enforced)

```typescript
// apps/web/src/lib/data/queries.ts
import { createClient } from '@/lib/supabase/server';

export async function fetchOrders(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_lines(...)')
    .eq('customer_id', userId);

  if (error) throw new Error(error.message);
  return data;
}
```

**Mutations** (Modify data, RLS enforced)

```typescript
// apps/web/src/lib/data/mutations.ts
export async function createOrder(order: Omit<Order, 'id' | 'created_at'>) {
  const supabase = createClient();
  const { data, error } = await supabase.from('orders').insert([order]).select().single();

  if (error) throw new Error(error.message);
  return data;
}
```

**Realtime Subscriptions**

```typescript
// apps/web/src/lib/data/realtime.ts
export function subscribeToOrderUpdates(orderId: string, callback: (order: Order) => void) {
  const supabase = createClient();
  return supabase
    .from('orders')
    .on('*', (payload) => callback(payload.new))
    .eq('id', orderId)
    .subscribe();
}
```

### 7.5 Error Handling

- Use `throw` for unrecoverable errors (will propagate to error boundary)
- Use `try-catch` in client components for recoverable errors
- Log errors to external service (Sentry, LogRocket, etc. — TBD)

```typescript
try {
  await createOrder(formData);
} catch (error) {
  console.error('Order creation failed:', error);
  setError('Failed to create order. Please try again.');
}
```

### 7.6 Authentication & Authorization

**Middleware** (`src/middleware.ts`)

- Protects `/mana`, `/portal`, `/vendor` routes
- Redirects unauthenticated users to `/login`
- Validates session via Supabase auth cookies

**Role-Based Access Control** (RBAC)

- Enforced in database via **RLS policies**
- Frontend checks `profile.role` for UI visibility (not security)
- Database enforces: Admins can see all, Customers see own orders, Vendors see own shipments

---

## 8. Key Features & Routes

### 8.1 Mana Admin Portal (`/mana`)

| Route                         | Status          | Purpose                                      |
| ----------------------------- | --------------- | -------------------------------------------- |
| `/mana/allocation-board`      | 🚧 Placeholder  | Drag-drop boxes → orders (complex real-time) |
| `/mana/order-intake`          | ✅ **Complete** | Fast phone order entry with timer, pricing   |
| `/mana/order-inbox`           | ✅ Complete     | Order queue review                           |
| `/mana/inventory`             | 🚧 Placeholder  | Lot/box management, vendor import            |
| `/mana/pick-slips`            | 🚧 Placeholder  | Print-ready picking documents                |
| `/mana/finance-queue`         | 🚧 Placeholder  | Invoices + credit claims, QBO sync           |
| `/mana/vendor-reconciliation` | 🚧 Placeholder  | Vendor settlements, net-due calculation      |
| `/mana/ceo-dashboard`         | 🚧 Placeholder  | KPIs, charts, executive summary              |
| `/mana/finance-dashboard`     | 🚧 Placeholder  | Revenue, margin, AR trends                   |
| `/mana/operations-dashboard`  | 🚧 Placeholder  | Throughput, allocation fill, fulfillment     |
| `/mana/admin`                 | 🚧 Placeholder  | Users, roles, permissions                    |
| `/mana/customers`             | 🚧 Placeholder  | Customer directory & tier management         |
| `/mana/credits`               | 🚧 Placeholder  | Quality downgrades & refunds                 |
| `/mana/documents`             | 🚧 Placeholder  | Document archive                             |
| `/mana/price-sheet`           | 🚧 Placeholder  | Pricing management                           |
| `/mana/purchase-orders`       | 🚧 Placeholder  | Vendor PO tracking                           |
| `/mana/settings`              | 🚧 Placeholder  | User profile settings                        |
| `/mana/vendor-verification`   | 🚧 Placeholder  | Onboarding review                            |

### 8.2 Customer Portal (`/portal`)

- `/portal/orders` — Browse order history
- `/portal/order/:id` — Order details
- `/portal/invoices` — Billing documents
- `/portal/claims` — Dispute & credit claims
- `/portal/price-sheet` — View applicable pricing
- `/portal/settings` — Account settings

### 8.3 Vendor Portal (`/vendor`)

- `/vendor/shipments` — Inbound shipment tracking
- `/vendor/documents` — Upload invoices & spec sheets
- `/vendor/settlements` — Payment statements
- `/vendor/upload` — Import inventory data
- `/vendor/settings` — Company profile

---

## 9. Build & Deployment

### 9.1 Build Process

```bash
pnpm build              # Run Next.js build
```

**Output**:

- Next.js: `.next/` directory (static + server functions)
- Optimized bundle with code splitting by route

### 9.2 Environment Variables

**Public (NEXT*PUBLIC*\*)**

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public read-only key

**Private (Server-only)**

- `SUPABASE_SERVICE_ROLE_KEY` — Admin access (for server migrations)
- `DATABASE_URL` — For future API/background jobs

### 9.3 Deployment Targets

**Vercel** (Recommended for Next.js)

- Auto-detects Next.js, configures preview deployments
- Vercel config: `vercel.json` at app root
- Environment variables in Vercel dashboard

**Docker** (Alternative)

- Dockerfile in `apps/web/`
- See `docker-compose.yml` for example build

---

## 10. Common Tasks

### 10.1 Add a New Page

1. Create directory: `src/app/mana/new-feature/`
2. Add `page.tsx` (server component by default)
3. Import types from `@web/lib/data/types`
4. Fetch data using `@web/lib/data/queries`
5. Use Tailwind classes for styling
6. Add route to sidebar navigation component

```typescript
// apps/web/src/app/mana/new-feature/page.tsx
import { fetchData } from '@web/lib/data/queries';

export default async function FeaturePage() {
  const data = await fetchData();
  return (
    <div className="p-6">
      {/* UI */}
    </div>
  );
}
```

### 10.2 Add a Data Type

1. Add table/view to Supabase schema (via migration)
2. Run `supabase gen types` (auto-generates `database.types.ts`)
3. Export row type in `src/lib/data/types.ts`

```typescript
export type NewEntity = Tables['new_entities']['Row'];
```

### 10.3 Add a Query

1. Create function in `src/lib/data/queries.ts`
2. Use Supabase client (RLS enforced)
3. Import in pages/components

```typescript
export async function fetchNewEntity(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from('new_entities').select().eq('id', id).single();

  if (error) throw error;
  return data;
}
```

### 10.4 Add a Client Component with State

```typescript
'use client';
import { useState } from 'react';

export default function InteractiveComponent() {
  const [state, setState] = useState('');

  return (
    <div>
      <input value={state} onChange={(e) => setState(e.target.value)} />
    </div>
  );
}
```

---

## 11. Testing

### 11.1 Unit Tests (Planned)

- Jest as test runner
- React Testing Library for component tests
- Focus on: queries, mutations, utilities

### 11.2 E2E Tests (Planned)

- Playwright or Cypress for user flows
- Test: login → order creation → pick slip → export

### 11.3 Running Tests

```bash
pnpm test                   # Run all tests
pnpm test:watch            # Watch mode
```

---

## 12. Git Workflow & Branching

### 12.1 Branches

- `master` — Production-ready code
- `feature/*` — Feature branches (one feature per branch)
- `bugfix/*` — Bug fixes
- `hotfix/*` — Critical production patches

### 12.2 Commit Messages

Follow conventional commits (enforced by commitlint):

```
feat(web): add allocation board
fix(orders): handle timezone in ship date
chore(deps): upgrade React to v19.2.4
docs(setup): update local environment steps
```

### 12.3 Pull Requests

- Require code review before merge
- CI checks (lint, build, type check) must pass
- Descriptive PR title & body
- Link to issues/tasks

---

## 13. Troubleshooting

### Issue: Build fails with "cannot find module"

**Solution**: Run `pnpm install` and restart dev server

### Issue: Supabase auth not working locally

**Solution**: Ensure Supabase credentials in `.env` are correct. Clear browser cookies & refresh.

### Issue: Page shows "404" or blank

**Solution**: Check middleware.ts — may be redirecting unauthenticated users. Verify route exists in file structure.

### Issue: Tailwind styles not applying

**Solution**: Ensure class is in content paths (checked in `next.config.ts`). Restart dev server.

---

## 14. Resources & Links

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com
- **TypeScript**: https://www.typescriptlang.org

---

## Glossary

- **RLS** — Row-Level Security (database policy enforcing row-access)
- **SSR** — Server-Side Rendering (via Next.js server components)
- **Realtime** — Supabase WebSocket subscriptions
- **Turbo** — Monorepo build system
- **Turbopack** — Next.js bundler (faster than Webpack)
