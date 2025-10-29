# External APIs

## Clerk API

- **Purpose:** Authentication, user management, and role metadata for pilot users.  
- **Documentation:** https://clerk.com/docs/reference  
- **Base URL(s):** `https://api.clerk.com/v1/` (server), `https://api.clerk.com/latest/` (frontend SDK)  
- **Authentication:** Publishable key (frontend) and secret key (server) stored in Vercel/Convex environment variables.  
- **Rate Limits:** 200 requests/min default.
- **Licensing / SLA:** Startup plan with 99.9% uptime SLA; contract reviewed annually; budget owner recorded in ops handbook.

Key Endpoints:
- `GET /users/{id}` – Sync role metadata into Convex on login.
- `POST /users/{id}/metadata` – Optional role updates from admin tools.

Integration Notes: Use Clerk React hooks on the frontend; Node SDK inside Convex; configure webhooks to invalidate metadata; protect webhooks with HMAC.

**Outage Plan:** Monitor https://status.clerk.com. If Clerk is degraded:
- Announce maintenance banner; block new sessions by toggling `auth.disabled` flag in Convex config collection.
- For critical access, pre-generate magic links stored in secure vault and distribute manually.
- Escalate via Clerk support channel; log incident in `docs/runbooks/auth-outage.md`.

## n8n Workflow Webhook

- **Purpose:** Receives Convex data, orchestrates AI enrichment, writes back structured insights.  
- **Documentation:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/  
- **Base URL(s):** n8n cloud webhook URL (environment-specific).  
- **Authentication:** Shared secret via HMAC header (`N8N_WEBHOOK_SECRET`).  
- **Rate Limits:** Controlled by n8n plan; expected 1–4 runs per day.

Key Endpoints:
- `POST /webhook/seraphine-insights` – Trigger workflow to pull sales data snapshot.
- `POST /webhook/seraphine-ingest` – n8n pushes AI insights into Convex ingestion mutation.

Integration Notes: Outbound calls only from server actions to keep secrets off the client; set retry policy with exponential backoff; log failures into Convex `ingestion_failures` collection; enforce IP allowlist or rotate secret if URL leaks.
