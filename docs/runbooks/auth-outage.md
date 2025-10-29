# Authentication Outage Runbook

## Purpose
Provide a repeatable process when Clerk authentication is unavailable or degraded so Seraphine operators can continue critical work.

## Detection
- Monitor https://status.clerk.com and internal alerts.
- Support tickets or user reports of login failures.

## Immediate Actions
1. Confirm incident and severity via Clerk status dashboard.
2. Post update in #seraphine-pilot Slack channel announcing temporary auth issues.
3. Toggle Convex `config` document flag `authDisabled = true` (used by frontend to display maintenance banner and block new sessions).
4. Pause automated invite emails or onboarding flows.

## Temporary Access (If Required)
1. Generate one-time magic links for critical users from Clerk dashboard prior to disabling sessions.
2. Store links in secured 1Password vault entry `Seraphine/Clerk Emergency Links`.
3. Share individually over encrypted channel; expire or revoke after use.

## Vendor Escalation
- Open support ticket with Clerk (include deployment ID, timeframe, business impact).
- Reference SLA (99.9% uptime) and request estimated time to recovery.
- Record ticket number in incident doc.

## Recovery
1. Once Clerk restores service, clear `authDisabled` flag.
2. Re-enable onboarding flows and automated emails.
3. Verify login, POS, and dashboard flows end-to-end.
4. Confirm no stale sessions remain (optional: force re-auth for privileged roles).

## Post-Incident
- Capture timeline and resolution summary in `docs/runbooks/incident-log.md` (append entry).
- Identify improvements (e.g., alert thresholds, pre-generated access lists).
- Review with team during next retrospective.
