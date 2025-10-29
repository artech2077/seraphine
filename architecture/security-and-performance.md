# Security and Performance

**Frontend Security**
- CSP Headers: `default-src 'self'; script-src 'self' 'unsafe-inline' https://*.clerk.com; connect-src 'self' https://*.clerk.com https://*.convex.cloud https://*.n8n.cloud; img-src 'self' data:; frame-src https://*.clerk.com`
- XSS Prevention: Next.js auto-escaping, sanitize markdown from AI insights with `dompurify`, rely on controlled component props.
- Secure Storage: Clerk session cookies (HttpOnly); offline POS queue stored in encrypted IndexedDB using `REPORTS_ENCRYPTION_KEY`.

**Backend Security**
- Input Validation: Shared Zod schemas enforced in Convex mutations before writes.
- Rate Limiting: Convex scheduler barrier (10 submissions/min/operator); Next.js middleware using in-memory limiter for MVP.
- CORS Policy: Convex functions restricted to Vercel domains; Next.js API remains same-origin.
- Transport Security: All endpoints served via Vercel, Convex, Clerk, and n8n managed HTTPS; no plaintext access paths.
- Data at Rest: Convex, Clerk, and Vercel manage encrypted storage; no raw secrets persist in repo. Sensitive environment variables stored only in managed secret stores.
- Least Privilege: Clerk roles limited to `owner` and `pilotTester`; n8n uses Convex service key scoped to ingestion mutations; Vercel project permissions restricted to core team.
- Infrastructure Isolation: Next.js routes run on Vercel edge/serverless runtimes with platform firewalls; Convex provides isolated multi-tenant deployment per project with no direct database access. Only outbound webhooks to n8n are allowed, and ingress is limited to HTTPS endpoints with HMAC validation.

**Authentication Security**
- Token Storage: Clerk handles cookies; server actions fetch session using Clerk SDK.
- Session Management: 24-hour session lifetime; step-up re-auth for catalog edits with Clerk.
- Password Policy: Managed in Clerk dashboard (12-char minimum with complexity).
- Credential Management: Secrets distributed through Vercel/Convex/Clerk dashboards; local `.env` values sourced from 1Password vault and never committed.

**Frontend Performance**
- Bundle Size Target: < 220 KB gzipped per main route.
- Loading Strategy: Use server components by default; split non-critical POS modules with dynamic imports.
- Caching Strategy: Convex live queries for real-time data; `revalidateTag` for reports.

**Backend Performance**
- Response Time Target: <150 ms p95 for Convex mutations/queries.
- Database Optimization: Use defined indexes and daily aggregation job to precompute totals.
- Caching Strategy: Rely on Convex caching and Next.js revalidation; no extra cache layer for MVP.
- Scaling Strategy: Vercel and Convex serverless runtimes auto-scale horizontally per request; ensure limits monitored via platform dashboards. No single-region state aside from Convex—enable additional region when pilot expands.
