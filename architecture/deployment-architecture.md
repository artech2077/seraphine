# Deployment Architecture

## Deployment Strategy

**Frontend Deployment:**  
- Platform: Vercel (Next.js App Router)  
- Build Command: `pnpm turbo run build --filter=web`  
- Output Directory: `.next` (handled by Vercel)  
- CDN/Edge: Vercel Edge Network with optional ISR on report routes.

**Backend Deployment:**  
- Platform: Convex Cloud (`seraphine` deployment)  
- Build Command: `pnpm turbo run deploy:convex` (wraps `convex deploy`)  
- Deployment Method: Convex CLI publishes schema/functions per environment, triggered after successful Vercel deploy.  
- Rollback & Recovery: Vercel supports instant rollback by promoting the previous deployment via dashboard/CLI; Convex snapshots (see Data Migration & Recovery) enable targeted restoration. Runbooks stored in `docs/runbooks` cover coordinated rollback steps across both platforms.
- Secondary Region Readiness: Documented plan to replicate Convex deployment and Vercel project in `eu-central` once pilot scales; requires provisioning env vars, enabling database replication, and verifying latency impacts before cutover.

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm test:e2e -- --reporter=list --headed=false

  deploy-preview:
    needs: lint-test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Preview
        run: curl -X POST "$VERCEL_PREVIEW_HOOK_URL"
      - name: Trigger Convex Preview Sync
        run: curl -X POST "$CONVEX_PREVIEW_HOOK_URL"
```

| Environment | Frontend URL                           | Backend URL                         | Purpose                 |
|-------------|-----------------------------------------|-------------------------------------|-------------------------|
| Development | http://localhost:3000                   | http://localhost:8187               | Local development       |
| Staging     | https://seraphine-staging.vercel.app    | https://seraphine-staging.convex.cloud | Internal QA / dry run |
| Production  | https://seraphine.vercel.app            | https://seraphine.convex.cloud      | Live internal pilot     |
