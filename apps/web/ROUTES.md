# Mana Operations Platform - Routes

## 🗺️ Application Routes

```
EOF Web Application
│
├── / (Home)
│   └── Link to Mana Platform
│
└── /mana (Main Platform)
    │
    ├── → Redirects to /mana/allocation-board
    │
    ├── /mana/allocation-board          🚧 Placeholder
    │   │
    │   └── OPERATIONS
    │       └── Complex board for allocating inventory boxes to orders
    │           - Drag and drop functionality
    │           - Split box feature
    │           - Multiple scenarios (live, split, shortage)
    │           - Real-time updates
    │
    ├── /mana/order-intake              ✅ COMPLETE
    │   │
    │   └── OPERATIONS
    │       └── Phone order entry system
    │           - Customer selection with auto-fill
    │           - Species picker
    │           - Quantity adjustment
    │           - Ship date selection
    │           - Live pricing calculation
    │           - Timer tracking (target: under 30s)
    │
    ├── /mana/inventory                 🚧 Placeholder
    │   │
    │   └── OPERATIONS
    │       └── Lot and inventory management
    │           - View all lots with details
    │           - Import vendor files
    │           - Box-level tracking
    │           - Grade and species info
    │           - Validation and error handling
    │
    ├── /mana/pick-slips                🚧 Placeholder
    │   │
    │   └── OPERATIONS
    │       └── Print-ready picking documents
    │           - Multiple slip tabs
    │           - Box picking lists
    │           - Packing instructions
    │           - Signature section
    │           - Status stamps
    │           - Print/PDF export
    │
    ├── /mana/finance-queue             🚧 Placeholder
    │   │
    │   └── FINANCE
    │       └── Invoice and credit management
    │           - Two tabs: Invoices & Claims
    │           - QuickBooks sync status
    │           - Approval workflow
    │           - Credit claim processing
    │           - Summary cards
    │
    ├── /mana/vendor-reconciliation     🚧 Placeholder
    │   │
    │   └── FINANCE
    │       └── Vendor settlement documents
    │           - Multiple vendor tabs
    │           - Sold items tracking
    │           - Quality downgrade credits
    │           - Net due calculation
    │           - Print-ready format
    │           - Email functionality
    │
    └── /mana/ceo-dashboard             🚧 Placeholder
        │
        └── OVERVIEW
            └── Executive dashboard
                - KPI cards (Revenue, Margin, Boxes, Shortages)
                - Inventory position by warehouse
                - Margin trend chart
                - Top customers ranking
                - Buying intelligence
                - Real-time metrics
```

---

## 🎯 Route Status

| Route                         | Status          | Complexity  | Features                              |
| ----------------------------- | --------------- | ----------- | ------------------------------------- |
| `/mana`                       | ✅ Complete     | Low         | Redirect to allocation-board          |
| `/mana/allocation-board`      | 🚧 Placeholder  | **High**    | Drag-and-drop, split boxes, scenarios |
| `/mana/order-intake`          | ✅ **Complete** | Medium      | Customer entry, timer, pricing        |
| `/mana/inventory`             | 🚧 Placeholder  | Medium-High | Import modal, validation, filters     |
| `/mana/pick-slips`            | 🚧 Placeholder  | Medium      | Print layout, tabs, status            |
| `/mana/finance-queue`         | 🚧 Placeholder  | Medium      | Two tabs, QBO sync, approvals         |
| `/mana/vendor-reconciliation` | 🚧 Placeholder  | Medium      | Print layout, credits, tabs           |
| `/mana/ceo-dashboard`         | 🚧 Placeholder  | Medium-High | Charts, KPIs, sparklines              |

---

## 🔗 Navigation Links

### Sidebar Navigation (All Pages)

**OPERATIONS**

- Allocation Board → `/mana/allocation-board`
- Order Intake → `/mana/order-intake` ✅
- Lots & Inventory → `/mana/inventory`
- Pick Slips → `/mana/pick-slips`

**FINANCE**

- Finance Queue → `/mana/finance-queue`
- Vendor Recon → `/mana/vendor-reconciliation`

**OVERVIEW**

- CEO Dashboard → `/mana/ceo-dashboard`

---

## 📱 Page Layouts

### Standard Operations Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Navigation Sidebar (218px)                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Header Bar (58px)                                      │
│  ├── Page Title                                         │
│  └── Actions/Filters                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Main Content Area (Scrollable)                         │
│  └── Page-specific content                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Order Intake Layout (Complete Example)

```
┌─────────────────────────────────────────────────────────┐
│ Nav (218px) │ Header: "Order Intake" + Timer           │
├─────────────┼─────────────────────────────────────────┤
│             │                           │             │
│  OPERATIONS │  Entry Form               │  Live       │
│  • Board    │  ├── Customer             │  Ticket     │
│  • Intake ✓ │  ├── Species              │  Preview    │
│  • Inventory│  ├── Quantity             │             │
│  • Pick     │  └── Ship Date            │             │
│             │                           │             │
│  FINANCE    │                           │             │
│  • Queue    │                           │             │
│  • Recon    │                           │             │
│             │                           │             │
│  OVERVIEW   │                           │             │
│  • Dashboard│                           │             │
│             │                           │             │
└─────────────┴───────────────────────────┴─────────────┘
```

---

## 🎨 Route-Specific Features

### `/mana/allocation-board`

**Key Features:**

- Left column: Open orders list
- Right area: Available inventory grid
- Drag-and-drop box assignment
- Split box modal
- Undo functionality
- Presence indicators
- Real-time sync status

**Complexity:** HIGH (drag-and-drop, real-time updates)

---

### `/mana/order-intake` ✅ COMPLETE

**Key Features:**

- Customer autocomplete with recent list
- Auto-fill tier, carrier, terms
- Species selection chips
- Quantity picker with presets
- Date selection (today/tomorrow/other)
- Live ticket preview
- Timer with target tracking
- Dynamic pricing calculation

**Complexity:** MEDIUM (forms, state management)

---

### `/mana/inventory`

**Key Features:**

- Lot table with expand/collapse
- Box grid per lot
- Filter tabs (all, received, available, allocated, shipped)
- Import vendor file drawer
- Row validation with error/warning flags
- Fix button for correctable errors
- Progress bar for import

**Complexity:** MEDIUM-HIGH (import modal, validation)

---

### `/mana/pick-slips`

**Key Features:**

- Tab navigation between slips
- Print-optimized layout
- Box checklist with specs
- Packing instructions
- Signature line
- Status stamps (LOCKED, READY)
- Print/PDF export

**Complexity:** MEDIUM (print styles, tabs)

---

### `/mana/finance-queue`

**Key Features:**

- Two-tab interface (Invoices / Claims)
- Summary cards with counts
- QuickBooks connection status
- Invoice approval workflow
- Error handling for failed syncs
- Credit claim review
- Counter/approve actions

**Complexity:** MEDIUM (tabs, approval flow)

---

### `/mana/vendor-reconciliation`

**Key Features:**

- Tab navigation between vendors
- Print-optimized document layout
- Sold items breakdown
- Credit tracking with reasons
- Net due calculation
- Status stamps
- Email and print actions

**Complexity:** MEDIUM (print layout, tabs)

---

### `/mana/ceo-dashboard`

**Key Features:**

- KPI cards with trends
- Warehouse inventory breakdown
- Margin trend sparkline (SVG)
- Top customers bar chart
- Buying intelligence table
- Period switcher (today/week/month)
- Real-time metrics

**Complexity:** MEDIUM-HIGH (charts, data visualization)

---

## 🚀 Getting Started

### Access the Complete Page

```bash
# Start dev server
pnpm dev

# Visit Order Intake (Complete)
http://localhost:3000/mana/order-intake
```

### Implement a New Page

1. Choose a route (e.g., `/mana/inventory`)
2. Open `apps/web/src/app/mana/inventory/page.tsx`
3. Follow the pattern from `/mana/order-intake/page.tsx`
4. Convert HTML from `Mana Operations Platform/Inventory.dc.html`
5. Test functionality

---

## 📚 Documentation

- **Detailed Guide**: `apps/web/MANA_MIGRATION.md`
- **Quick Summary**: `MANA_MIGRATION_SUMMARY.md`
- **This Routes Guide**: `ROUTES.md`
- **Complete Status**: `MIGRATION_COMPLETE.md`

---

**Last Updated**: June 23, 2026  
**Status**: 1/7 pages complete
