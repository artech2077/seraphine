# Seraphine Setup Guide

This document describes how to bootstrap the Seraphine project from a clean machine, configure required services, and run the app in development and production.

## 1. Prerequisites

- **Node.js 20 LTS** (project tested with Node 20.11+). Install via [nvm](https://github.com/nvm-sh/nvm) or download from [nodejs.org](https://nodejs.org/en/download).
- **npm 10+** (ships with Node 20).
- Accounts for **Supabase**, **Clerk**, and **Vercel**.
- Supabase CLI (installed below).

Verify versions:

```bash
node -v
npm -v
```

## 2. Install project dependencies

From the repository root:

```bash
npm install
```

This installs Next.js, TailwindCSS, Clerk, Supabase client SDK, and development tooling (ESLint, shadcn CLI, etc.).

## 3. Supabase CLI setup

1. **Install the CLI**
   - macOS (Homebrew): `brew install supabase/tap/supabase`
   - Other platforms: follow [Supabase CLI docs](https://supabase.com/docs/guides/cli/getting-started).
2. **Authenticate**: `supabase login` (paste your Supabase access token).
3. **Link the project**: `supabase link --project-ref <your-project-ref>`; the ref is visible in the Supabase dashboard.
4. (Optional) **Start local stack**: `supabase start` spins up local Postgres + Studio; `supabase stop` tears it down.

## 4. Environment variables

Duplicate `.env.local.example` (coming soon) or create `.env.local` manually with the following keys:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for the environment (dev for now). |
| `CLERK_SECRET_KEY` | Clerk secret API key used server-side. |
| `CLERK_WEBHOOK_SECRET` | Random string shared with Clerk webhooks for signature verification. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://<project>.supabase.co` or local). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous public key (used by browser clients later). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key used by server-only code (webhooks, migrations). |

Example template:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...
```

> Never commit `.env.local` to Git. Configure the same variables in Vercel → Settings → Environment Variables for Development, Preview, and Production.

## 5. Clerk configuration (development)

1. In the Clerk dashboard, stay in the **Development** instance until a production domain is ready.
2. Add `http://localhost:3000` under **Allowed origins & redirect URLs**.
3. (Optional now, required post-Vercel) Create a **Webhook** targeting `/api/webhooks/clerk` and copy the secret into `CLERK_WEBHOOK_SECRET`.
4. Copy the publishable + secret keys into `.env.local`.

When a custom domain is available, create/enable the Production instance, add the domain, and swap the keys in Vercel + env files.

## 6. Running the app locally

```bash
npm run dev   # starts Next.js with hot reload on http://localhost:3000
```

### Quality checks

```bash
npm run lint  # ESLint with Next.js config
```

## 7. Building / previewing production

```bash
npm run build   # creates the production build
npm start       # serves the built app locally
```

Use this flow before pushing to ensure the build passes the same way it will on Vercel.

## 8. Database migrations

The Supabase schema lives under `supabase/migrations/`.

### First-time application

```bash
supabase db push             # applies migrations to the linked remote project
# or, to reset local stack:
supabase db reset --local    # drops + reapplies locally
```

Migration `0001_link_clerk_users.sql` creates:
- `user_role` enum
- `pharmacies`, `users`, `pharmacy_memberships` tables
- Unique indexes used by the Clerk ↔ Supabase sync webhook

### Generating types

After schema changes, regenerate TypeScript types:

```bash
supabase gen types typescript --project-id <ref> --schema public > types/database.ts
```

## 9. Deploying to Vercel (preview)

1. Create a new Vercel project and connect this repository.
2. Add the environment variables from section 4 to **all** environments.
3. Trigger a deployment; confirm the build logs are clean.
4. Once a stable URL exists, point Clerk webhooks to `https://<app>.vercel.app/api/webhooks/clerk` and run the verification checklist outlined in `docs/auth-sync.md`.

You can defer the webhook test suite until deployment (see roadmap item 1.5), but keeping these steps noted ensures nothing is forgotten.
