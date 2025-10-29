# Monitoring and Observability

- **Frontend Monitoring:** Vercel Web Analytics for Core Web Vitals and navigation performance, with weekly digest to the pilot Slack channel.  
- **Backend Monitoring:** Convex dashboard metrics (latency, invocation count) plus Logtail structured logs for mutations/queries.  
- **Error Tracking:** Sentry (browser + server) capturing request IDs and user metadata; alerts routed to #seraphine-pilot.  
- **Performance Monitoring:** Vercel Edge analytics (TTFB, render time) and Convex performance panel for query profiling.  
- **n8n Freshness Alerts:** Scheduler pings `insights.listLatest` timestamp every 5 minutes; if stale >30 minutes, send Slack alert and toggle dashboard “stale data” banner via Convex config.
- **Auth Provider Watchdog:** CloudCron job checks https://status.clerk.com every 5 minutes and posts to #seraphine-pilot when degraded; quarterly tabletop drill executes `docs/runbooks/auth-outage.md`.

**Key Metrics**

**Frontend:**
- Core Web Vitals (LCP, FID, CLS) by route
- JavaScript error rate per module
- API response times for Convex queries/mutations
- POS scans per hour and dashboard filter usage
- Insight freshness age (minutes since last n8n sync)
- Offline queue depth and frequency of capped events

**Backend:**
- Request rate per Convex function
- Error rate segmented by `error.code`
- Response time percentiles (p50/p95) for `sales.createSale`, `insights.listLatest`
- Index hit ratio and slow query alerts in Convex
