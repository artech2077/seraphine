# Source Tree

Authoritative map of the directories and key files that ship with the Seraphine monorepo so contributors can locate code quickly and keep new assets consistent with the architecture contract.

```text
seraphine/
├─ apps/
│  └─ web/
│     ├─ app/                  # Next.js 14 App Router routes, layouts, and route handlers
│     ├─ components/           # Reusable UI components that depend on shared/ui primitives
│     ├─ modules/              # Feature modules that bundle UI, hooks, and Convex queries
│     ├─ hooks/                # Cross-cutting React hooks (auth, analytics, data access)
│     ├─ stores/               # Zustand stores and Context providers
│     ├─ lib/                  # Framework utilities (formatters, client wrappers)
│     ├─ styles/               # Tailwind configuration and global CSS
│     ├─ tests/                # Component and integration tests (Vitest/Playwright)
│     ├─ public/               # Static assets served by Next.js
│     └─ package.json
├─ packages/
│  ├─ convex/                  # Convex schema, mutations, queries, and server-side utilities
│  ├─ shared/                  # Shared domain types (Zod), validation helpers, constants
│  ├─ ui/                      # shadcn-based component library and Tailwind tokens
│  └─ config/                  # Shared ESLint/Prettier/Turbo configuration packages
├─ tooling/
│  ├─ eslint-config/           # Centralized lint rules consumed by each package
│  └─ playwright/              # Playwright test runner configuration and fixtures
├─ scripts/                    # One-off maintenance and automation scripts
├─ docs/                       # PRD, architecture shards, and operational runbooks
├─ .github/workflows/          # CI/CD workflows (lint, test, deploy)
├─ .env.example                # Example environment variables for local development
├─ package.json                # Root dependencies and shared scripts
├─ pnpm-workspace.yaml         # Workspace package definitions
├─ turbo.json                  # Turbo build pipeline configuration
└─ README.md                   # Project overview and quickstart
```

## Contribution Guidance

- Place new product surfaces inside `apps/web/modules/{feature}` co-locating UI, hooks, and data access code as defined in the feature stories.
- Shared logic that spans multiple modules should live in `packages/shared` (types/utilities) or `packages/ui` (design system components).
- Backend behaviours belong in `packages/convex` with mutations and queries co-located by domain; avoid duplicating Convex client logic in the frontend.
- Keep automated tests close to the code under test: component/unit tests in `apps/web/tests`, API contract tests near Convex functions, and E2E flows in `tooling/playwright`.
