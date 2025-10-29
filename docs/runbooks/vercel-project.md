# Vercel Project Reference

## Purpose
Document the canonical Vercel project linkage for the Seraphine repository so CI evidence of AC2 lives in source control and future operators can confirm the deployment wiring.

## Project Metadata
- **Project slug:** `seraphine-c8p2`
- **Default domains:** `seraphine-c8p2.vercel.app` (preview & production auto-domain)

## Verification Steps
1. In Vercel, open the `seraphine-c8p2` project and confirm GitHub integration points to `seraphine-ai/seraphine`.
2. Check the Environments tab to ensure Preview and Production map to `seraphine-c8p2.vercel.app` and share the same Git repository.
3. Validate that deploy hooks (Preview/Production) are active and match the webhook URLs referenced in `docs/architecture.md#deployment-architecture`.

## Operational Notes
- Do not commit `.vercel/project.json` or environment secrets; store them in Vercel and reference via deploy hook metadata.
- Update this runbook if the project slug or domain changes (e.g., when adding a custom domain).
