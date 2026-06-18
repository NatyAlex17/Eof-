# EOF / Mana ERP Modernization — skills.md

## Purpose
This file defines the project skills, domain knowledge, engineering capabilities, and operating competencies expected from human developers and AI-assisted coding agents contributing to the EOF / Mana ERP modernization project.

## 1. Business Domain Skills

### 1.1 Seafood Distribution Operations
Contributors should understand or quickly learn:

- Perishable inventory behavior
- Lot and box-level tracking
- Variable weights and partial boxes
- Customer prioritization during shortages
- Vendor packing lists
- Consignment and vendor settlement workflows
- 3PL coordination
- BOL and shipment confirmation handling
- Credit claims for spoilage, downgrade, shortages, or fulfillment issues

### 1.2 EOF Operational Context
Required domain awareness:

- Google Sheets currently acts as the operational command center.
- FreshO may remain a transitional order source or export source.
- QuickBooks Online remains the accounting system of record.
- HubSpot is used for customer and sales relationship data.
- The allocation process, referred to as “the dance,” is operationally sensitive and knowledge-heavy.
- EOF to Mana migration must preserve continuity and financial correctness.

## 2. Product and UX Skills

### 2.1 Workflow Design
Required skills:

- Mapping current-state and future-state workflows
- Designing role-based operational screens
- Reducing spreadsheet friction without ignoring spreadsheet logic
- Designing correction workflows for imported data
- Designing review/approval flows for finance and AI-generated drafts
- Designing exception handling for real operations

### 2.2 Key Interfaces to Design
- Order management screen
- Inventory and lot dashboard
- Allocation board
- Import correction workflow
- Finance review queue
- QBO sync health panel
- Vendor reconciliation workflow
- Logistics dashboard
- BOL review workflow
- Executive KPI dashboard

## 3. Frontend Engineering Skills

Expected stack:

- TypeScript
- React
- Next.js App Router
- TanStack Query
- TanStack Table
- Form handling with React Hook Form or equivalent
- Zod or shared schema validation
- shadcn/ui, Tailwind CSS, or equivalent design system
- WebSocket/SSE client handling where required
- Error boundaries and loading states
- Role-based navigation and UI permissions

Frontend engineers must be able to build:

- Complex editable tables
- Allocation board interactions
- Optimistic updates with rollback
- Conflict resolution interfaces
- Dashboard widgets
- Filterable operational views
- Admin and finance review queues
- Responsive layouts for desktop-first operational users

## 4. Backend Engineering Skills

Expected stack:

- Python
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- PostgreSQL
- Redis
- Background workers
- REST API design
- Transaction management
- Row-level locking
- Idempotency patterns
- External API integration
- Structured logging

Backend engineers must be able to build:

- Auth and RBAC middleware
- Inventory and lot services
- Allocation transaction services
- Migration and sync jobs
- QBO integration services
- HubSpot sync services
- Google Sheets sync services
- Email/BOL parsing services
- Notification services
- Audit logging
- Retry and dead-letter workflows

## 5. Database and Data Skills

Required skills:

- PostgreSQL schema design
- Transaction isolation
- Locking strategy
- Audit table design
- Indexing for operational dashboards
- Migration scripts
- Data normalization
- CSV ingestion
- Data reconciliation
- Row-level discrepancy reporting
- Materialized views or reporting tables where needed

Critical data entities include:

- User
- Role
- Permission
- Customer
- Vendor
- Product
- SKU
- Lot
- Box
- InventoryMovement
- Order
- OrderLine
- Allocation
- Shipment
- BOL
- InvoiceDraft
- CreditClaim
- CreditMemo
- VendorSettlement
- IntegrationSyncRecord
- AuditLog

## 6. Integration Skills

### 6.1 QuickBooks Online
Required capabilities:

- OAuth2 setup
- Token refresh handling
- Customer mapping
- Product/service mapping
- Invoice creation
- Credit memo creation
- Sync failure handling
- Duplicate prevention through idempotency
- Finance review workflows

### 6.2 Google Sheets
Required capabilities:

- Google service account or OAuth setup
- Sheet/tab mapping
- Row fingerprinting
- Scheduled sync
- Conflict detection
- Parity reporting
- Dry-run migration
- Operational fallback planning

### 6.3 HubSpot
Required capabilities:

- Customer/contact sync
- Mapping external IDs
- Handling API rate limits
- Non-blocking sync errors

### 6.4 Email, SendGrid, and Twilio
Required capabilities:

- Transactional email
- Inbound parse webhooks
- SMS alerts
- Notification fallback logic
- Communication logs

### 6.5 3PL and Logistics
Required capabilities:

- Packing slip export
- BOL attachment handling
- Shipment status update workflow
- CSV/email/API fallback pattern

## 7. AI and Automation Skills

AI/automation contributors should understand:

- Prompt versioning
- Confidence scoring
- Human-in-the-loop workflows
- LLM extraction guardrails
- Cost controls
- PII/data handling
- Fallback to manual review
- Evaluation sets for extraction accuracy

AI should be used carefully for:

- Email order parsing
- BOL extraction
- Vendor document extraction
- Development scaffolding
- Test generation
- Documentation drafts

AI should not independently finalize:

- Financial transactions
- Allocation decisions
- Migration reconciliation
- Production deployment approvals

## 8. QA and UAT Skills

Required QA capabilities:

- Business-rule test design
- Integration test planning
- Migration dry-run validation
- UAT script preparation
- Defect triage
- Regression testing
- Concurrency test support
- Release readiness evidence

Critical UAT workflows:

1. Create order
2. Import vendor packing list
3. Receive inventory lot
4. Allocate boxes/partial boxes
5. Generate packing slip
6. Receive BOL
7. Send customer notification
8. Generate invoice draft
9. Push approved invoice to QBO
10. Process credit claim
11. Generate vendor settlement report
12. Validate dashboard KPIs

## 9. DevOps and Infrastructure Skills

Required capabilities:

- Docker and Docker Compose
- GitHub Actions
- Environment management
- Secrets management
- SSL/TLS configuration
- Database backup and restore
- Object storage setup
- Redis worker deployment
- Monitoring and alerting
- Rollback planning
- Production smoke testing

## 10. Governance and Delivery Skills

Required skills:

- Sprint planning
- Backlog grooming
- Phase gate management
- Change request documentation
- Risk and issue tracking
- Stakeholder communication
- Sign-off management
- Release notes
- Cutover coordination
- Hypercare management

## 11. Skill Ownership Matrix

| Area | Primary Owner | Supporting Owner |
|---|---|---|
| Architecture | Lead Solution Architect | Backend / DevOps |
| Allocation Engine | Lead Solution Architect | Backend / QA |
| Inventory & Lots | Backend Engineer | Frontend / QA |
| Frontend UX | Frontend Engineer | UX / BA |
| QBO Integration | Backend Engineer | Finance / QA |
| Sheets Migration | Backend Engineer | BA / Operations |
| Logistics & 3PL | Backend Engineer | Operations / QA |
| Dashboards | Frontend Engineer | Backend / Leadership |
| AI Extraction | AI / Automation Engineer | Backend / QA |
| Security & RBAC | Lead Engineer | DevOps / QA |
| CI/CD | DevOps Engineer | Lead Engineer |
| UAT | QA / UAT Analyst | PM / Business Owners |

## 12. Minimum Skill Standard
A contributor is ready to work on this project if they can:

- Explain the end-to-end order-to-invoice workflow.
- Understand the difference between Google Sheets transitional truth and ERP future truth.
- Avoid breaking auditability, RBAC, or migration traceability.
- Write tests for the module they change.
- Document business-rule changes clearly.
- Escalate uncertainty instead of guessing in allocation, inventory, finance, or migration workflows.
