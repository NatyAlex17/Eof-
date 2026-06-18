# EOF / Mana ERP Modernization

This repository contains the ERP modernization platform for EOF / Mana operations.

## Project Goals

- Replace fragmented spreadsheet-driven workflows with a centralized ERP-style platform.
- Preserve operational continuity during the transition from EOF to Mana.
- Support inventory, orders, allocation, logistics, finance, reconciliation, and dashboards.
- Integrate with Google Sheets, QuickBooks Online, HubSpot, SendGrid, Twilio, and 3PL workflows.

## AI Development Files

- `AGENTS.md` — how AI agents should behave on this project
- `RULES.md` — engineering, delivery, security, testing, and operational rules
- `SKILLS.md` — domain and technical skills required for contributors

## Local Development

1. Copy `.env.example` to `.env`.
2. Fill in local secrets or disabled feature flags.
3. Start dependencies:

```bash
docker compose up postgres redis
```

4. Start API and web apps according to their local app setup.

## Delivery Notes

This is a controlled phased implementation. Do not bypass phase gates, migration validation, QBO safety rules, allocation concurrency protections, or audit logging.
