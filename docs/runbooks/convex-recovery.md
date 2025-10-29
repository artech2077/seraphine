# Convex Recovery Runbook

## Purpose
Restore Convex data to a known-good state in the event of corruption, failed deployment, or accidental data loss. Applies to the Seraphine production and staging deployments.

## Prerequisites
- Convex CLI installed (`npm install -g convex`) and authenticated (`convex login`).
- Access to the Convex project dashboard with snapshot permissions.
- Latest `.env` file containing `CONVEX_DEPLOYMENT` and admin keys.
- Identify the snapshot timestamp you want to restore (from Convex dashboard).

## Steps

### 1. Freeze Writes
1. Notify stakeholders in #seraphine-pilot Slack channel.
2. Pause automated jobs (n8n workflow) if they write to Convex.
3. Disable user access by adding a maintenance flag in Clerk (optional).

### 2. Capture Current State (Optional)
```bash
convex snapshot create --deployment $CONVEX_DEPLOYMENT --name "pre-restore-$(date +%Y%m%d-%H%M)"
```

### 3. Restore Snapshot
```bash
convex snapshot restore \
  --deployment $CONVEX_DEPLOYMENT \
  --snapshot <snapshot-id-from-dashboard>
```

- Use the snapshot ID displayed in the Convex console (e.g., `2025-10-27T04:00:00Z`).
- Restoration is immediate; existing data will be overwritten.

### 4. Redeploy Functions (If Needed)
```bash
pnpm turbo run deploy:convex
```

### 5. Smoke Test
1. Run automated smoke tests (`pnpm test:e2e --filter smoke`).
2. Manually verify:
   - Dashboard insights render.
   - POS flow can create a sale.
   - Report download works.
3. Check Convex logs for errors.

### 6. Resume Writes
1. Re-enable n8n workflow triggers.
2. Notify stakeholders that service is restored.

## References
- Convex Snapshot docs: https://docs.convex.dev/database/snapshots
- Vercel Rollback (for frontend): use Vercel dashboard “Promote previous deployment”.
- Related scripts: `scripts/seed-pilot.ts`, `scripts/purge-pilot.ts` (planned).
