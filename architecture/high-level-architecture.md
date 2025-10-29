# High Level Architecture

## Technical Summary

Seraphine runs as a monorepo Next.js 14 application hosted on Vercel, using the App Router to serve both interactive UI and backend APIs. Convex supplies the operational data tier, enabling strongly typed mutations for POS transactions while exposing reactive queries that keep dashboard insights live. Clerk handles authentication and role enforcement across server actions and route handlers, ensuring all pilot features remain internal-only. n8n operates as an external automation workflow that ingests pilot data, enriches it with AI, and writes read-only insight records back into Convex for the dashboard. Infrastructure relies on Vercel’s managed edge plus Convex’s serverless deployment with environment parity between preview and production. Observatory hooks—Vercel analytics, Convex logs, and Sentry—provide end-to-end visibility so the team can iterate quickly without overbuilding.

## Platform and Infrastructure Choice

**Platform:** Vercel + Convex + Clerk + n8n  
**Key Services:** Vercel (Next.js hosting, deploy previews, edge cache); Convex (database and backend functions); Clerk (auth, role management); n8n Cloud (AI workflow orchestration); Vercel Analytics; Logtail for structured logs.  
**Deployment Host and Regions:** Vercel (iad1 primary) and Convex (iad1) with n8n in the same geography to minimize latency.

| Option                    | Pros                                                                                     | Cons / Trade-offs                                                                 | Decision |
|---------------------------|-------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|----------|
| Vercel + Convex (Chosen)  | Optimized for Next.js 14, typed Convex client, minimal ops, fast preview deploys          | Vendor coupling; Convex learning curve                                           | ✅       |
| AWS Amplify + DynamoDB    | Enterprise-grade flexibility, native IAM controls                                        | More boilerplate (Lambda/API Gateway), slower MVP velocity                        | ❌       |
| Supabase + Next.js        | Excellent DX, SQL tooling                                                                 | Less native support for reactive queries than Convex; diverges from agreed stack | ❌       |

## Repository Structure

Adopt a pnpm-powered monorepo to keep frontend, Convex backend functions, shared schemas, and tooling cohesive:

```
seraphine/
├─ apps/
│  └─ web/                 # Next.js 14 App Router application
├─ packages/
│  ├─ api-clients/         # Typed fetch wrappers for server actions
│  ├─ convex/              # Convex schema, mutations, queries
│  ├─ shared/              # Zod schemas, domain types, utilities
│  └─ ui/                  # Tailwind/shadcn component extensions
├─ tooling/
│  ├─ eslint-config/       # Shared lint rules
│  └─ playwright/          # E2E test setup
├─ docs/                   # Architecture, PRD, story docs
└─ .github/                # Actions workflows
```

## Architectural Patterns

- **Serverless Fullstack with BFF Routing:** Next.js App Router plus Convex functions operate as a backend-for-frontend, keeping latency low and avoiding a separate API gateway. _Rationale:_ Matches the PRD’s single codebase mandate and simplifies auth, logging, and deployments for the pilot scale.
- **Component-Driven UI with Co-located Data Hooks:** Components live alongside Convex query hooks, ensuring dashboard and POS screens stay reactive without manual cache wiring. _Rationale:_ Reduces duplicated fetch logic and keeps scan flows responsive to inventory changes.
- **Domain-Oriented Packages:** Shared types, service helpers, and validation live in `packages/shared` and `packages/convex`, enforcing a single source for schema definitions. _Rationale:_ Prevents drift between frontend forms and backend mutations while giving AI agents clear import paths.
- **Structured Error Pipeline:** Server actions and Convex mutations throw typed errors wrapped by a common handler, and the frontend surfaces them via standardized toasts/modals. _Rationale:_ Guarantees predictable UX during barcode or AI sync failures and lays groundwork for observability.
- **Event Log & Reactive Streaming:** Sales capture emits append-only events in Convex that dashboards subscribe to. _Rationale:_ Allows real-time updates without polling and later enables audit/history views with minimal redesign.
