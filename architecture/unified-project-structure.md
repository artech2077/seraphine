# Unified Project Structure

```text
seraphine/
├─ apps/
│  └─ web/                       # Next.js App Router
│     ├─ app/
│     ├─ components/
│     ├─ modules/
│     ├─ hooks/
│     ├─ stores/
│     ├─ lib/
│     ├─ styles/
│     ├─ tests/
│     ├─ public/
│     └─ package.json
├─ packages/
│  ├─ convex/
│  ├─ shared/
│  ├─ ui/
│  └─ config/
├─ scripts/
├─ docs/
│  ├─ prd.md
│  ├─ front-end-spec.md
│  └─ architecture.md
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     └─ deploy.yml
├─ .env.example
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
└─ README.md
```
