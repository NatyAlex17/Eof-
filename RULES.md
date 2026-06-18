# EOF / Mana ERP Modernization — rules.md

## 1. Delivery Rules

### 1.1 Phased Delivery
The project must be delivered in controlled phases:

1. Discovery, audit, and delivery baseline
2. Core ERP foundation and allocation MVP
3. Google Sheets transition and migration controls
4. Finance automation and QuickBooks integration
5. Logistics, 3PL workflows, BOL processing, and notifications
6. Dashboards, intelligence, and automation
7. EOF to Mana migration, UAT, training, and go-live
8. Hypercare and stabilization

No phase should move forward without the defined phase gate approval.

### 1.2 Sprint Discipline
- Sprint duration: 2 weeks.
- Sprint scope is locked after sprint planning.
- New work enters the backlog unless approved as an urgent change.
- Sprint demos must show working software, tested workflows, or completed delivery artifacts.
- Every sprint must end with documented completed work, open risks, open defects, decisions, and next actions.

### 1.3 Change Control
Any requirement outside the approved sprint/phase scope must be classified:

| Level | Description | Governance Rule |
|---|---|---|
| Green | Minor clarification, text change, small validation adjustment | Can be handled within sprint if low impact |
| Yellow | Workflow adjustment, additional report, field mapping change | Requires documented impact note and business owner approval |
| Red | New module, external integration, architectural shift, major workflow change | Requires formal change request, cost/timeline impact, and executive approval |

## 2. Architecture Rules

### 2.1 Recommended Stack
- Frontend: Next.js, React, TypeScript, TanStack Query, TanStack Table, shadcn/ui or equivalent component system
- Backend: Nest JS, Prisma , Supabase
- Database: PostgreSQL
- Queue/Cache: Redis + worker process
- File Storage: DigitalOcean Spaces or AWS S3-compatible object storage
- Monitoring: Sentry + structured logs + uptime checks
- CI/CD: GitHub Actions
- Containerization: Docker and Docker Compose

### 2.2 Architecture Constraints
- Use a modular monorepo structure.
- Keep business rules in backend services, not only frontend UI.
- Enforce RBAC server-side.
- All write operations touching inventory, allocation, finance, migration, or customer notifications must be auditable.
- External integrations must use explicit retry, failure status, and manual recovery paths.
- File storage must not depend on local server filesystem for production.
- Database migrations must be version-controlled.

### 2.3 Event and Job Rules
Background jobs must be used for:

- QBO synchronization
- Google Sheets sync
- Email/BOL parsing
- Customer notifications
- Migration dry runs
- Dashboard aggregation
- Retryable external API calls

All background jobs must have:

- Unique job identifier
- Idempotency key where relevant
- Status tracking
- Retry policy
- Dead-letter or failed state
- Error visibility for admin/support users

## 3. Data Rules

### 3.1 Source of Truth Rules
Before cutover:

- Google Sheets remains the transitional operational source of truth for selected workflows.
- ERP data must be compared against Google Sheets through parity reports.
- Conflicts must be visible and resolved before migration/cutover approval.

After cutover:

- ERP becomes the operational source of truth for approved modules.
- Google Sheets may remain read-only or limited to approved transition workflows.

### 3.2 Migration Rules
- No production migration without at least one successful staging dry run.
- Migration scripts must log row counts, skipped rows, transformed rows, and failed rows.
- Migration scripts must generate discrepancy reports.
- Migration must support restart/resume where practical.
- Active lot, box count, weight, and allocation parity must be validated before go-live.

### 3.3 Data Validation Rules
Validate all critical input:

- SKU/species names
- Vendor names
- Customer names
- Lot numbers
- Box identifiers
- Weights
- Quantities
- Prices
- Delivery dates
- Invoice fields
- Credit memo fields

Invalid data must not silently pass. It should be rejected, quarantined, or routed to a correction workflow.

## 4. Allocation Rules

The allocation engine is a high-risk module. The following rules are mandatory:

- Prevent double allocation of the same box/weight.
- Use transactional locking or equivalent concurrency protection.
- Support partial box splitting only through auditable service logic.
- Preserve original lot/box lineage after split.
- Log every allocation, deallocation, split, override, shortage, and adjustment.
- Manual override requires permission and reason capture.
- Allocation UI must handle stale state and refresh conflicts.
- Allocation cannot trigger invoice creation until it reaches an approved shipment/invoice-ready state.

## 5. Financial Rules

QuickBooks and finance-related workflows must follow strict safety rules:

- Never create duplicate QBO invoices or credit memos.
- Use idempotency keys for QBO create operations.
- Finance approval is required before pushing invoices/credits to QBO unless explicitly approved otherwise.
- Failed syncs must be visible and retryable.
- Financial totals must be validated to cent-level accuracy.
- Invoice, credit, margin, landed cost, and commission rules require finance sign-off.
- Do not delete financial records; use void/cancel/reversal workflows where appropriate.

## 6. Security Rules

- Authentication required for all ERP application access.
- Authorization required on every protected backend endpoint.
- Admin and finance actions require explicit role permission.
- Audit logs must be append-only.
- Secrets must be stored in environment variables or a secrets manager.
- Production data must not be committed to the repository.
- File uploads must be type-checked and access-controlled.
- Sensitive logs must be redacted.
- Database backups must be encrypted or stored in a protected environment.

## 7. Testing Rules

### 7.1 Required Test Types
- Unit tests for business rules
- Integration tests for QBO, Sheets, HubSpot, SendGrid/Twilio, and 3PL workflows
- Migration tests for dry-run scripts
- Concurrency tests for allocation
- E2E tests for order-to-invoice workflows
- RBAC/security tests for protected workflows

### 7.2 Release Blocking Defects
Production release is blocked if any of the following are unresolved:

- Allocation double-booking risk
- Financial duplicate creation risk
- Migration parity failure
- Broken authentication or authorization
- Critical sync failure without fallback
- Incorrect invoice or credit memo totals
- Missing audit trail for critical workflows

## 8. Documentation Rules

Update documentation when changing:

- API contracts
- Database schema
- Environment variables
- Business rules
- Migration behavior
- Integration behavior
- Deployment procedures
- User-facing workflow behavior

Documentation must live near the implementation where possible and be summarized in the relevant `/docs` file.

## 9. Pull Request Rules

Every PR must include:

- Summary of changes
- Affected modules
- Test evidence
- Migration notes, if applicable
- Screenshots for UI changes, where practical
- Known risks or limitations
- Rollback notes for release-sensitive changes

## 10. Hard Stop Rules

Stop delivery and escalate if:

- The system can allocate the same inventory twice.
- QBO duplicate invoice/credit creation is possible.
- Migration results do not reconcile.
- Role permissions are bypassed.
- Production secrets are exposed.
- Critical operational workflow is not testable.
- Business owner rejects the accuracy of allocation, inventory, finance, or migration output.
