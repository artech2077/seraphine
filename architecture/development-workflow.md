# Development Workflow

## Prerequisites

```bash
brew install node@20 pnpm git
pnpm env use --global 20
pnpm install -g vercel@latest convex@latest
brew install watchman
```

## Initial Setup

```bash
git clone git@github.com:seraphine-ai/seraphine.git
cd seraphine
pnpm install
cp .env.example .env.local
cp .env.example .env
```

## Development Commands

```bash
pnpm dev         # Next.js + Convex dev server
pnpm dev:web     # Frontend only
pnpm dev:convex  # Convex local backend
pnpm test        # Vitest unit/integration
pnpm test:e2e    # Playwright
pnpm lint        # ESLint + type check
```

## Environment Configuration

```bash
# Frontend (.env.local)
NEXT_PUBLIC_CONVEX_URL="https://<deployment>.convex.cloud"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
NEXT_PUBLIC_DEFAULT_LOCALE="fr-FR"

# Backend (.env)
CONVEX_DEPLOYMENT="seraphine"
CONVEX_ADMIN_KEY="convex_admin_..."
CLERK_SECRET_KEY="sk_live_..."
N8N_WEBHOOK_URL="https://n8n.io/webhook/seraphine"
N8N_WEBHOOK_SECRET="super-secret-hmac"
REPORTS_ENCRYPTION_KEY="base64-32bytes"

# Shared
VERCEL_ANALYTICS_ID="va_..."
LOGTAIL_SOURCE_TOKEN="logtail_..."
```
