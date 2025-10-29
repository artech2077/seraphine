# Seraphine Monorepo

Bootstrap repository for the Seraphine pilot. The stack follows the architecture contract:

- Next.js 14 App Router app in `apps/web`
- Convex backend functions in `packages/convex`
- Shared type definitions and UI primitives in `packages/shared` and `packages/ui`
- Shared tooling (ESLint, Playwright) in `tooling/`

## Getting Started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

See `architecture/` for the complete system reference and `docs/` for runbooks and story tracking.
