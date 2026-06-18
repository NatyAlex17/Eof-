# EOF / Mana ERP Modernization — agent.md

## Purpose
This file defines how AI coding agents, pair-programming tools, and automated assistants should behave when contributing to the EOF / Mana ERP Modernization project.

The project is a business-critical ERP-style platform for seafood distribution operations. It touches live inventory, allocation, customer orders, logistics, QuickBooks financial workflows, Google Sheets transition workflows, and the EOF to Mana migration. AI agents must prioritize correctness, auditability, operational safety, and controlled delivery over speed.

## Project Context
EOF currently operates through a combination of FreshO, Google Sheets, QuickBooks Online, HubSpot, email, text messages, vendor CSV files, and 3PL coordination. Google Sheets currently behaves like the operational ERP and must be treated as a transitional source of truth until the approved cutover point.

The system being built will centralize:

- Customer order management
- Product, SKU, vendor, and customer master data
- Lot and box-level inventory tracking
- Allocation workflows, internally referred to as “the dance”
- Google Sheets sync and migration parity controls
- QuickBooks Online invoice and credit memo automation
- Vendor reconciliation and landed cost reporting
- 3PL logistics, BOL processing, and customer notifications
- Executive and operational dashboards
- EOF to Mana transition support

## Primary Agent Responsibilities
AI agents may assist with:

- Code scaffolding
- Boilerplate generation
- Test generation
- Documentation drafting
- Refactoring suggestions
- Migration script drafts
- API schema drafts
- UI component scaffolding
- Query optimization suggestions
- Error handling patterns
- Release checklist preparation

AI agents must not autonomously approve or finalize:

- Financial calculation rules
- Invoice generation logic
- Credit memo rules
- Inventory allocation rules
- Data migration parity results
- Production deployment decisions
- Security or permission changes
- Business cutover decisions

Any output related to financial, inventory, allocation, migration, or security workflows must be reviewed by a human engineer and, where applicable, by the responsible business owner.

## Required Engineering Behavior
When modifying code, agents must:

1. Read the relevant module context before editing.
2. Preserve existing business rules unless explicitly instructed otherwise.
3. Avoid broad rewrites unless required for a documented technical reason.
4. Keep changes small, reviewable, and testable.
5. Update or add tests for changed behavior.
6. Update documentation when public behavior, API shape, data model, or workflow behavior changes.
7. Avoid introducing hidden side effects.
8. Never remove audit logging, validation, authorization, retry, or idempotency protections.
9. Prefer explicit business-rule functions over inline conditional logic.
10. Preserve rollback paths for data migrations and release changes.

## Safety-Critical Areas
Treat the following areas as high-risk and require extra caution:

- Allocation engine and box/lot assignment logic
- Partial box splitting and weight variance calculations
- Inventory status transitions
- Google Sheets sync and conflict resolution
- Migration scripts and parity checks
- QBO invoice creation, updates, voids, and credit memo creation
- Vendor reconciliation and landed cost calculations
- RBAC and authorization checks
- File upload handling
- Background jobs and retry queues
- Customer notifications
- Production deployment scripts

## AI Use Rules for Email Parsing / LLM Extraction
If LLM-based extraction is used for inbound orders, BOLs, or vendor documents:

- AI output must create draft records only unless explicitly approved otherwise.
- Low-confidence extraction must require human review.
- Extracted fields must be logged with source message reference, prompt version, model/provider, timestamp, and confidence score.
- AI must not invent customer names, SKU names, quantities, weights, prices, or delivery dates.
- If the email/document does not contain a required value, the extracted value must be null or marked as missing.
- Human review is required before order confirmation, allocation, invoice generation, or customer notification.

## Data Protection Rules
Agents must never:

- Commit secrets, tokens, API keys, certificates, or credentials.
- Hardcode production URLs or credentials.
- Log sensitive financial data unnecessarily.
- Expose customer or vendor private information in test fixtures.
- Use production data in local tests unless anonymized and approved.
- Disable authentication or RBAC checks for convenience.

## Preferred Delivery Style
Agents should produce:

- Small pull requests
- Clear commit messages
- Tests alongside implementation
- Migration notes when data schema changes
- API examples when endpoints change
- Runbook updates when operational behavior changes
- Explicit TODOs only when attached to a tracked backlog item

## Definition of Done for AI-Assisted Work
A task is not complete until:

- Code compiles and passes linting.
- Relevant tests pass.
- New behavior has automated tests or documented manual test cases.
- API contracts are updated if changed.
- Migration scripts are reversible where practical.
- Audit, RBAC, validation, and error handling are preserved.
- Any operational or financial workflow change is reviewed by the appropriate human owner.

## Escalation Triggers
The agent should stop and request human review if:

- A business rule is ambiguous.
- Existing behavior conflicts with the written requirements.
- A change may alter financial totals.
- A change may alter allocation results.
- A migration discrepancy is detected.
- A QBO sync path can create duplicate records.
- A security-sensitive control is unclear.
- Production data may be affected.

## Project North Star
The system must reduce manual operational load without weakening business control. The goal is not to automate everything blindly. The goal is to make EOF/Mana operations more visible, auditable, resilient, and scalable while preserving the real-world flexibility required for perishable seafood distribution.
