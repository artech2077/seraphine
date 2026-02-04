# QA Environment

## Stable QA URL

- QA URL: TODO
- QA branch: TODO (e.g. `qa`)
- Vercel project or alias: TODO
- Access protection: TODO (Vercel auth, password, or IP allowlist)

## Required QA Environment Variables

These must be set in the QA deployment and must not reuse Production values.

- `NEXT_PUBLIC_APP_ENV=qa`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`
- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_APP_URL` (optional but recommended)

## Deploy Flow

1. Push to the QA branch.
2. Confirm the QA URL updates to the latest deployment.
3. Confirm the UI shows the QA banner.

## Smoke Test

- Sign-in works.
- Organization selection works.
- At least one core module route loads without runtime errors.

## Notes

- QA must use a non-production Clerk app and Convex deployment.
- Update this document once the stable QA URL and branch are finalized.
