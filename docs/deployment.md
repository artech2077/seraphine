# Vercel Deployment Guide

This checklist walks you through deploying Seraphine to Vercel and verifying the production environment. Execute the steps in order—items in **bold** require manual action in the corresponding dashboard.

## 1. Connect the repository

1. **In Vercel → Add New Project**, import the GitHub repo.
2. When prompted, keep the default build command (`next build`) and output directory (`.next`).
3. Confirm the framework detection (Next.js) and create the project.

## 2. Configure environment variables

Add the following variables in **Vercel → Settings → Environment Variables** and copy the exact values from `.env.local` (or production secrets):

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Development / Preview / Production | Use Clerk dev keys until Production instance is ready; swap to prod keys once the custom domain is live. |
| `NEXT_PUBLIC_CLERK_PROXY_URL` | Development / Preview / Production | Absolute URL to your domain plus `/clerk` (ensures assets load through the first-party domain). |
| `CLERK_SECRET_KEY` | Development / Preview / Production | Server-side key (keep private). Replace with prod key after creating the Clerk Production instance. |
| `CLERK_WEBHOOK_SECRET` | Development / Preview / Production | Random string reused in Clerk dashboard (dev or prod depending on the instance). |
| `NEXT_PUBLIC_SUPABASE_URL` | Development / Preview / Production | Project URL (`https://xyz.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Development / Preview / Production | Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Development / Preview / Production | Service-role key (never exposed client-side). |

> Tip: use the "Encrypt" option for sensitive keys. After saving, redeploy to propagate.

## 3. Trigger the first deployment

1. Push `main` or click **Deploy** in Vercel.
2. Wait for build logs to finish cleanly (no warnings/errors) and confirm the preview URL loads the app.
3. Record the preview URL; it is still useful for debugging even after moving to the custom domain.

## 4. Custom domain & Clerk Production instance

1. **Add your custom domain in Vercel → Settings → Domains** and point DNS to Vercel (add CNAME/A records per instructions). Wait for verification and SSL provisioning.
2. **Create/enable the Clerk Production instance**:
   - Add both `https://<custom-domain>` and (optionally) `https://<project>.vercel.app` to Allowed origins & redirect URLs.
   - Copy the Production publishable + secret keys.
3. Update Vercel environment variables (all scopes) with the production Clerk keys.
4. **Create a Clerk webhook** in the Production instance pointing to `https://<custom-domain>/api/webhooks/clerk` (and optionally the Vercel preview URL). Use a new `CLERK_WEBHOOK_SECRET` value and update Vercel accordingly.
5. (Optional) keep the Development instance for localhost testing; its keys should remain in `.env.local` for dev builds.

## 5. Smoke test checklist

Run these commands locally (matching Vercel’s build) before or after deployment:

```bash
npm run lint
npm run build
npm start   # optional: verify production server locally
```

Manual UI tests (on custom domain or preview):

- Sign in through Clerk (match the instance: dev for localhost, prod for custom domain).
- Verify the landing page toggles SignedIn/SignedOut states.
- Hit `/api/webhooks/clerk` with Clerk’s “Send test event” to confirm 200 OK.

## 6. Clerk ↔ Supabase verification

Once the webhook is wired, follow `docs/auth-sync.md`:

1. Trigger `user.created` / `user.updated` events and confirm rows in Supabase `users`.
2. Create a Clerk organization, add a member, assign admin/member roles; ensure `pharmacies` and `pharmacy_memberships` tables update accordingly.
3. Remove membership and delete the user, verifying cleanup.
4. Monitor Vercel logs for any 500 errors; Clerk retries failed events automatically.

## 7. Post-deployment operations

- Pin the custom domain + preview domain and share credentials with the team.
- Add the deployment status badge (optional) to `README.md`.
- Re-run the Clerk ↔ Supabase checklist whenever keys/webhooks change.

By completing this checklist, roadmap item **1.5 Production Deployment (Vercel)** is considered done; the only remaining actions are the manual steps in sections 4–6 whenever you run through deploy + verification.
