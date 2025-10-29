# Requirements

## Functional
1. **FR1:** Provide an internal dashboard that displays AI-generated highlights (cash variance, top-selling products, inventory watchlist) sourced exclusively from the n8n workflow via Convex.
2. **FR2:** Deliver a POS workflow that registers sales through barcode scanning, supports manual lookup fallback, and records tender details for the daily sales log.
3. **FR3:** Maintain a minimal product catalog with barcode, name, price, and tax code fields to power the POS and AI results.
4. **FR4:** Generate daily sales summaries and downloadable CSV reports to support manual reconciliation and internal review.
5. **FR5:** Enforce authentication and role-based access (Owner, Pilot Tester) using Clerk, limiting all MVP features to authenticated users.
6. **FR6:** Capture pilot feedback within the product (quick notes or survey submission) and store it in Convex for later analysis.

## Non Functional
1. **NFR1:** New developers can provision a working environment (clone repo, configure env vars, run `pnpm dev`) in under 60 minutes following documented steps.
2. **NFR2:** Preview deployments and production share the same Next.js/Convex configuration; health checks and smoke tests must pass before a release is marked ready.
3. **NFR3:** All data in transit uses HTTPS; sensitive config is only handled via Clerk, Convex, or Vercel dashboards—no secrets committed to Git.
4. **NFR4:** Baseline observability captures structured logs with request IDs, surfaced in Vercel/Convex consoles, and exposes a `/api/healthz` route for monitoring.
5. **NFR5:** The dashboard initial render completes within 2 seconds on modern laptops over typical office Wi-Fi, and POS scans register within 250 ms of barcode input.
