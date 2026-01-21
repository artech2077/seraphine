# AGENTS.md

## 0. Purpose

You are an AI coding assistant working in this repository.

Primary goals:

- Follow the existing tech stack and design system.
- Use Tailwind CSS for all styling.
- Use shadcn/ui via the shadcn MCP server for UI components.
- Avoid ad-hoc styling or new UI frameworks.
- Maintain security and protect secrets.
- Keep the project understandable for non-developers.

If any instruction here conflicts with a user request, tell the user.

---

## 1. Tech Stack (Assumed)

- Framework: Next.js (React)
- Styling: Tailwind CSS
- UI components: shadcn/ui (via MCP)
- Backend / DB: Convex
- Auth: Clerk
- Deployment: Vercel
- Language: TypeScript where possible

Do not add other UI libraries unless explicitly requested.

---

## 2. Commands (Build / Lint / Test)

Package manager: `pnpm` (see `package.json`).

- Install: `pnpm install`
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Start: `pnpm start`
- Lint: `pnpm lint`

Testing:

- No test script is defined in `package.json`.
- If a test runner is added later, run tests via the script in `package.json`.
- Single-test guidance (only if tests exist):
  - `pnpm test -- <pattern>` (generic pattern)
  - Use the specific runner syntax from `package.json` once present.

Formatting:

- Prettier is installed. Use `prettier --write` on modified files.
- ESLint is configured; prefer `pnpm lint` for full runs.

Pre-commit:

- Husky + lint-staged are configured; staged files run ESLint/Prettier.

---

## 3. Styling & Design System (STRICT)

Single source of truth:

- Design tokens live in `styles/global.css` and `tailwind.config.{js,ts}`.
- Use Tailwind classes that map to those tokens.
- Do not introduce ad-hoc values or custom CSS.

Allowed styling:

- Tailwind utility classes using design tokens.
- shadcn/ui components and their props.
- Tokens via Tailwind theme bindings.

Forbidden styling:

- Inline styles (`style={{ ... }}`)
- Tailwind arbitrary values (e.g. `mt-[13px]`, `text-[#123456]`)
- New CSS files other than `styles/global.css`
- Custom selectors that override shadcn/ui components

If a new visual value is required, propose adding a token in `global.css` and Tailwind config.

---

## 4. shadcn/ui & MCP Rules

- All UI should be built with shadcn/ui components.
- Use the shadcn MCP server to discover/add components and patterns.
- Prefer composition over custom UI.
- If a component doesn’t exist, ask before creating a custom one.

---

## 5. Project Structure

Follow existing structure; typical layout:

- `app/` or `pages/` – Next.js routes
- `src/components/ui/` – shadcn/ui components
- `src/components/` – app-level components
- `src/lib/` – utilities
- `styles/global.css` – tokens and base styles

Place new components in the established folders.

---

## 6. Code Style Guidelines

TypeScript:

- Prefer explicit types for props and public APIs.
- Avoid `any`; use `unknown` + narrowing if needed.
- Use `type` for unions, `interface` for extendable shapes.

Imports:

- Order imports: built-ins, external packages, absolute internal, relative.
- Group with blank lines between sections.
- Prefer named imports; avoid default exports unless existing pattern uses them.

Formatting:

- Let Prettier handle formatting; avoid manual spacing tweaks.
- Keep line lengths reasonable; rely on Prettier defaults.

Naming:

- Components: `PascalCase`.
- Hooks: `useSomething`.
- Utilities: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE` only when truly constant.

Error handling:

- Validate user input before use.
- Surface safe, user-friendly errors in UI.
- Avoid leaking stack traces or secrets to clients.
- Log server-side errors with useful context only.

React / Next.js:

- Prefer server components unless client state/effects are required.
- Keep components small and focused.
- Use `"use client"` only when necessary.

---

## 7. Data, Auth, Security

- Use Convex for data access; follow existing query/mutation patterns.
- Use Clerk for authentication; do not roll custom auth.
- Never hardcode secrets or tokens; use env vars.
- Validate/authorize user actions in Convex functions.

---

## 8. Testing & Verification Discipline

For non-trivial changes:

- Run all applicable checks (lint, build, tests when available).
- If tests don’t exist for the area, note this explicitly in summaries.
- Every new feature must include unit tests for UI, feature APIs, and related Convex functions.
- Place feature tests under `features/<module>/__tests__/` and Convex tests under `convex/__tests__/`.

If roadmap items are marked complete, update `roadmap.md` with:

- What changed
- How it was verified (exact commands)
- Manual QA steps
- Limitations or follow-ups

---

## 9. Deployment Assumptions

- Target platform: Vercel.
- Avoid unsupported Node APIs in server components.

---

## 10. Cursor / Copilot Rules

- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` files were found.
