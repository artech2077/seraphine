# Seraphine Product Requirements Document (PRD)

## Goals and Background Context

### Goals
- Deliver a lean internal pilot that demonstrates barcode-first POS capture and real-time cash visibility using the target stack.
- Validate AI-powered operational insights by surfacing n8n-generated recommendations directly inside the product dashboard.
- Stand up the production-grade foundations (repository, deployment automation, secrets, observability) required for rapid iteration without overbuilding non-essential features.

### Background Context
Seraphine previously targeted a full pharmacy operating system in its first release, including forecasting, supplier management, and compliance-heavy workflows. That ambition slowed progress and obscured validation. We are now realigning around a smaller, internal-only MVP that the founding team and trusted partners can test quickly. The product must prove two critical experiences: registering sales via barcode scanning and reviewing AI insights that highlight cash and inventory signals. The stack is standardized on Next.js acting as both frontend and backend, Convex as the datastore, Clerk for authentication, Tailwind CSS with shadcn/ui for design system components, and Vercel for hosting. AI content is produced by an n8n workflow that gathers pilot data, enriches it, and writes structured insights back into Convex for display. No custom domain is required for the MVP.

### Change Log
| Date       | Version | Description                                        | Author |
|------------|---------|----------------------------------------------------|--------|
| 2025-10-23 | 0.2     | Updated stack, MVP scope, and epic structure       | PM     |
| 2025-10-20 | 0.1     | Initial PRD draft kickoff                          | PM     |

## Technical Foundations & Stack

- **Application Framework:** Next.js 14 (App Router) delivers the UI and server-side APIs in a single codebase. Server Actions and Route Handlers expose internal APIs without creating a separate backend service.
- **Data Layer:** Convex persists operational data (products, sales events, AI insights) and publishes reactive queries consumed by the Next.js app.
- **Authentication:** Clerk provides user management, session enforcement, and role assignment; it is the sole identity provider at MVP.
- **Hosting & Delivery:** Vercel hosts all environments using the generated Vercel domain. Production runs with manual promotion, previews run on pull requests.
- **Design System:** Tailwind CSS and shadcn/ui compose reusable presentation primitives, themed for Seraphine and optimized for rapid iteration.
- **AI Data Pipeline:** n8n orchestrates pilot data ingestion and AI enrichment. The workflow deposits read-only records into Convex collections dedicated to dashboards and reports. n8n does not own transaction workflows (POS, reconciliation, etc.).
- **Tooling & Testing:** pnpm workspace, ESLint, Vitest, and Playwright cover linting, unit, and smoke tests. GitHub Actions run on every PR; Vercel preview deploys block merges on failure.
- **Secrets Management:** Environment variables are synced through `.env.example`, Vercel environment settings, and Convex/Clerk dashboards. No secret values are stored in the repo.

## MVP Scope Summary

- Internal-only deployment accessible to the core team and a small pilot group.
- Barcode-driven POS flow for capturing sales and calculating tender totals.
- AI-powered dashboard surfaces daily highlights (variance alerts, forecast hints) using n8n-generated data.
- Lightweight reporting (CSV/PDF) enables offline review and stakeholder updates.
- Minimal catalog maintenance sufficient for barcode registration and pricing.
- Feedback instruments (notes, quick survey) capture qualitative responses from internal testers.

## Requirements

### Functional
1. **FR1:** Provide an internal dashboard that displays AI-generated highlights (cash variance, top-selling products, inventory watchlist) sourced exclusively from the n8n workflow via Convex.
2. **FR2:** Deliver a POS workflow that registers sales through barcode scanning, supports manual lookup fallback, and records tender details for the daily sales log.
3. **FR3:** Maintain a minimal product catalog with barcode, name, price, and tax code fields to power the POS and AI results.
4. **FR4:** Generate daily sales summaries and downloadable CSV reports to support manual reconciliation and internal review.
5. **FR5:** Enforce authentication and role-based access (Owner, Pilot Tester) using Clerk, limiting all MVP features to authenticated users.
6. **FR6:** Capture pilot feedback within the product (quick notes or survey submission) and store it in Convex for later analysis.

### Non Functional
1. **NFR1:** New developers can provision a working environment (clone repo, configure env vars, run `pnpm dev`) in under 60 minutes following documented steps.
2. **NFR2:** Preview deployments and production share the same Next.js/Convex configuration; health checks and smoke tests must pass before a release is marked ready.
3. **NFR3:** All data in transit uses HTTPS; sensitive config is only handled via Clerk, Convex, or Vercel dashboards—no secrets committed to Git.
4. **NFR4:** Baseline observability captures structured logs with request IDs, surfaced in Vercel/Convex consoles, and exposes a `/api/healthz` route for monitoring.
5. **NFR5:** The dashboard initial render completes within 2 seconds on modern laptops over typical office Wi-Fi, and POS scans register within 250 ms of barcode input.

## Human & Agent Responsibilities

| Responsibility | Owner (Human) | Supporting Agent Tasks |
| -------------- | ------------- | ---------------------- |
| Vendor onboarding (GitHub, Vercel, Clerk, Convex, n8n) | Product Ops / Tech Lead creates accounts, manages billing, and grants access | Agents request credentials via documented intake template; no agent creates accounts or handles billing |
| Secrets management & rotation | Tech Lead maintains Vercel env vars and Convex/Clerk tokens | Agents update `.env.example`, CI references, and ensure secrets are consumed from runtime env only |
| Pilot data preparation for n8n | Founding team curates data exports and mapping rules | Agents document required formats and validate ingestion results inside Convex |
| POS hardware setup (barcode scanners) | Operations lead procures and configures USB scanners for test sites | Agents supply compatibility checklist and in-app scanner diagnostics |
| Internal training & feedback loop | Product team coordinates pilot sessions and collects feedback | Agents implement in-product feedback capture and surface aggregated results |

**Guiding Principles**
- Build only what is essential for the internal pilot while keeping the architecture ready for future expansion.
- Treat n8n outputs as read-only AI insights; transactional integrity lives inside Next.js and Convex.
- Default to automation for deployments and testing to avoid manual drift.
- Keep all copy and UI states French-first where applicable, but prioritize shipping the workflow over exhaustive localization.

## Epics & User Stories

### Epic 0 – Project Access & Foundations
Stand up the infrastructure, repositories, and shared knowledge needed to collaborate.

#### Story 0.1 GitHub & Vercel Project Bootstrap
- Establish the GitHub repository with branch protections and default CODEOWNERS.
- Link the repo to a Vercel project using the autogenerated Vercel domain (no custom domain).
- Configure GitHub Actions CI pipeline to run lint, unit tests, and Playwright smoke checks on every pull request.

#### Story 0.2 Vendor Credential Intake & Secrets Distribution
- Create `docs/ops/vendor-owners.md` listing human contacts and escalation paths for GitHub, Vercel, Clerk, Convex, and n8n.
- Document required credentials, scopes, and storage locations in a shared intake checklist; confirm delivery through 1Password/Doppler.
- Verify access by running `pnpm dlx vercel whoami`, `npx convex list`, Clerk API ping, and n8n workflow test using the provided secrets.

#### Story 0.3 Developer Onboarding Playbook
- Produce `docs/ops/onboarding.md` with hardware/software prerequisites, install steps, and troubleshooting tips.
- Include scripts or commands to seed Convex with sample catalog and AI insight data for local development.
- Ensure at least two team members follow the guide end-to-end and record completion notes.

### Epic 1 – Application Skeleton & Authentication
Create the core application structure, authentication, and UI shell.

#### Story 1.1 Next.js + Convex Baseline
- Initialize a Next.js 14 app with pnpm, ESLint, and TypeScript configured.
- Connect Convex client/server, including schemas for products, sales events, AI insights, and feedback notes.
- Implement lint and unit test suites with sample tests for Convex actions and React components.

#### Story 1.2 Clerk Authentication Integration
- Configure Clerk for the project, including French-localized sign-in/up flows.
- Add middleware to gate all app routes behind authentication and map Clerk user roles to app roles stored in Convex.
- Provide a seed script that creates an Owner and Pilot Tester account for development.

#### Story 1.3 UI Shell with Tailwind & shadcn/ui
- Set up Tailwind with Seraphine tokens and integrate shadcn/ui components (layout shell, navigation rail, button, card, table).
- Implement responsive layout with primary navigation for Dashboard, POS, Sales Log, and Settings.
- Add light/dark themes and French-first copy placeholders for key UI elements.

#### Story 1.4 Observability & Health Checks
- Add structured logging with request IDs for API routes and Convex actions.
- Expose `/api/healthz` returning app version, environment, and Convex connectivity status.
- Configure Vercel monitoring alerts for failed deploy hooks and health check regressions.

### Epic 2 – Internal Data & AI Insights
Surface enriched data produced by the n8n workflow to support decision-making.

#### Story 2.1 n8n Workflow Integration
- Define the n8n workflow contract (input data sources, transformation steps, output schema).
- Schedule or manually trigger the workflow to inject AI insight records into the dedicated Convex collection.
- Add validation to ensure malformed records are quarantined and surfaced via admin notifications.

#### Story 2.2 Dashboard Insight Cards
- Build Dashboard cards for cash variance, top-selling products, and attention alerts using data from Convex.
- Provide time range filters (today, last 7 days) and status badges indicating freshness of n8n data.
- Include empty/error states when no insights are available or workflow failures occur.

#### Story 2.3 Lightweight Reports & Exports
- Generate downloadable CSV summary of daily sales, cash variance, and AI recommendations.
- Offer quick-print PDF with the same content for leadership review.
- Track report generation events in Convex for auditing.

### Epic 3 – POS Barcode Pilot
Empower internal testers to record sales rapidly and review outcomes.

#### Story 3.1 Product Catalog & Barcode Registry
- CRUD interface for catalog items with barcode, name, price, tax, and optional notes.
- Import helper for CSV template to bulk load pilot catalog data.
- Detect duplicate barcodes and surface conflict resolution UI.

#### Story 3.2 Barcode Sale Capture
- POS screen listens for USB/wedge barcode scanners and provides manual search fallback.
- Capture item quantity, line total, and tender method; allow voids with confirmation.
- Persist sales events to Convex and update the dashboard in real time.

#### Story 3.3 Daily Sales Log & Reconciliation Snapshot
- Present a chronological sales log with filters for user, tender type, and variance flags.
- Compute daily totals (gross sales, refunds, cash expected) and display them alongside manual override inputs.
- Export the log to CSV/PDF alongside operator notes.

### Epic 4 – Pilot Feedback & Continuous Improvement
Collect insights from internal testers and close the loop.

#### Story 4.1 In-App Feedback Submission
- Provide contextual feedback entry points on Dashboard and POS screens with quick-tagging (bug, idea, confusion).
- Store submissions in Convex with user, timestamp, and screen metadata.
- Send summary notifications to the product team (email or Slack webhook).

#### Story 4.2 Pilot Analytics & Review Ritual
- Create a simple internal view aggregating usage stats (logins, scans per day, report downloads) and feedback tags.
- Schedule a recurring review meeting with notes captured in `docs/pilot/retro.md`.
- Document criteria for graduating features from pilot to production roadmap.

## Risks & Open Questions
- Barcode hardware compatibility must be validated early; fallback strategy needed if scanners behave differently across pharmacies.
- AI insight quality depends on the breadth and cleanliness of pilot data; additional manual review may be required during early runs.
- Internal-only deployment reduces compliance overhead now but will require fresh review before external launch.
