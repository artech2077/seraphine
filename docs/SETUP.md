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
   > We are intentionally skipping Docker/Supabase local stack setup until roadmap item **7.3**; keep this step for later if Docker is not yet installed.

## 4. Environment variables

Copy `.env.local.example` to `.env.local` and fill in the secrets for your environment:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for the environment (development instance for now). |
| `CLERK_SECRET_KEY` | Clerk secret API key used on the server. |
| `CLERK_WEBHOOK_SECRET` | Shared secret between Clerk and `/api/webhooks/clerk`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://<project>.supabase.co` or the local Supabase URL). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous key for browser/server RLS-aware clients. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key used only in secure server contexts (webhooks, migrations, scripts). |
| `SUPABASE_LOCAL_URL` *(optional)* | URL of the Supabase local stack, useful when running `supabase start`. |

Example:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...
# SUPABASE_LOCAL_URL=http://127.0.0.1:54321
```

> Never commit `.env.local` to Git. Configure the same variables in Vercel → Settings → Environment Variables for Development, Preview, and Production.
>
> **Current strategy:** use the Clerk **Development** instance everywhere (localhost plus all Vercel environments). Reuse the same publishable + secret keys across scopes until roadmap item 1.6 (Clerk production cutover) is executed.

## 5. Clerk configuration (development)

1. In the Clerk dashboard, stay in the **Development** instance until a production domain is ready.
2. Add `http://localhost:3000` under **Allowed origins & redirect URLs**.
3. (Optional now, required post-Vercel) Create a **Webhook** targeting `/api/webhooks/clerk` and copy the secret into `CLERK_WEBHOOK_SECRET`.
4. Copy the publishable + secret keys into `.env.local`.
5. Stay on the Clerk Development instance for every environment (local + Vercel) until roadmap item 1.6 is scheduled. No production instance or extra proxy is configured yet, so the same keys work everywhere.

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
# Local resets via `supabase db reset --local` will be reintroduced when roadmap item 7.3 enables Docker workflows.
```

Migration `0001_link_clerk_users.sql` creates:
- `user_role` enum
- `pharmacies`, `users`, `pharmacy_memberships` tables
- Unique indexes used by the Clerk ↔ Supabase sync webhook

Migration `0002_initial_schema.sql` adds:
- `suppliers`, `clients`, `products`, `sales`, `sale_items`, `stock_movements`, `cash_reconciliations`
- Supporting enums (`payment_type`, `stock_movement_type`) and triggers for `updated_at`
- RPC helpers: `create_sale_with_items` and `record_cash_reconciliation`

### Generating types

After schema changes, regenerate TypeScript types:

```bash
supabase gen types typescript --project-id <ref> --schema public > types/database.ts
# or, when using the local Docker stack:
supabase gen types typescript --local --schema public > types/database.ts
```

The generated `Database` type powers every client in `lib/supabase/*.ts`.

For detailed RPC usage examples and verification steps (local reset vs. remote push), see `docs/supabase.md`.

## 9. Deploying to Vercel (preview)

1. Create a new Vercel project and connect this repository.
2. Add the environment variables from section 4 to **all** environments.
3. Trigger a deployment; confirm the build logs are clean.
4. Once a stable URL exists, point Clerk webhooks to `https://<app>.vercel.app/api/webhooks/clerk` and run the verification checklist outlined in `docs/auth-sync.md`.

You can defer the webhook test suite until deployment (see roadmap item 1.5), but keeping these steps noted ensures nothing is forgotten.

## 10. Supabase RLS & Clerk Tokens

- Supabase now enforces Row Level Security (roadmap 2.2). Every table expects the JWT claim `sub` (or `clerk_id`) to match `users.clerk_id`.
- When a Clerk user signs in, exchange the Clerk session for a Supabase access token minted via the service-role client (server-side). Include at minimum:
  - `sub`: the Clerk user id.
  - Optional `clerk_id`: duplicate for clarity.
- The Supabase client inside the browser/server (created via `lib/supabase/browser.ts` or `lib/supabase/server.ts`) must use that JWT before querying tables with RLS.
- Until the exchange endpoint is implemented, simulate RLS locally/remote using `set_config('request.jwt.claims', ...)` as described in `docs/supabase.md`.
