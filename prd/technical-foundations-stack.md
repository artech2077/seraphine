# Technical Foundations & Stack

- **Application Framework:** Next.js 14 (App Router) delivers the UI and server-side APIs in a single codebase. Server Actions and Route Handlers expose internal APIs without creating a separate backend service.
- **Data Layer:** Convex persists operational data (products, sales events, AI insights) and publishes reactive queries consumed by the Next.js app.
- **Authentication:** Clerk provides user management, session enforcement, and role assignment; it is the sole identity provider at MVP.
- **Hosting & Delivery:** Vercel hosts all environments using the generated Vercel domain. Production runs with manual promotion, previews run on pull requests.
- **Design System:** Tailwind CSS and shadcn/ui compose reusable presentation primitives, themed for Seraphine and optimized for rapid iteration.
- **AI Data Pipeline:** n8n orchestrates pilot data ingestion and AI enrichment. The workflow deposits read-only records into Convex collections dedicated to dashboards and reports. n8n does not own transaction workflows (POS, reconciliation, etc.).
- **Tooling & Testing:** pnpm workspace, ESLint, Vitest, and Playwright cover linting, unit, and smoke tests. GitHub Actions run on every PR; Vercel preview deploys block merges on failure.
- **Secrets Management:** Environment variables are synced through `.env.example`, Vercel environment settings, and Convex/Clerk dashboards. No secret values are stored in the repo.
