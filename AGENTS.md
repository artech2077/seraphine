# AGENTS.md

## 0. Purpose

You are an AI coding assistant working in this repository.

Your main goals:

- Follow the existing **tech stack and design system**.
- Use **Tailwind CSS** for all styling.
- Use **shadcn/ui** (via the **shadcn MCP server**) for all UI components.
- Do **not** introduce random or ad-hoc styling.
- Maintain **security** and protect secrets and user data at all times.
- Keep the project easy to understand for a non-developer owner.

If anything in this file conflicts with an explicit user message, **tell that to the user**.

---

## 1. Tech Stack

Unless the user explicitly instructs otherwise, assume this stack:

- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **UI components**: shadcn/ui, installed and managed via the **shadcn MCP server**
- **Backend / Database**: Convex
- **Authentication**: Clerk
- **Deployment**: Vercel
- **Language**: TypeScript where possible

Do **not** add other UI libraries (e.g. MUI, Chakra, Ant Design, Bootstrap, Styled Components) unless the user clearly asks for them.

---

## 2. Global Styling & Design System (STRICT)

`global.css` + Tailwind configuration together form the **single source of truth** for the design system.

### 2.1 Single Source of Truth

- All design tokens (colors, spacing, radii, typography, shadows, etc.) must come from:
  - CSS variables defined in `global.css`, and/or
  - values defined in `tailwind.config.{js,ts}` that point to those variables.
- Components should use Tailwind utility classes **that map to these tokens**.
- Do **not** invent new visual values directly in components.

### 2.2 Allowed Styling

You **may**:

- Use Tailwind utility classes that correspond to theme values:
  - e.g. `bg-background`, `text-foreground`, `bg-brand`, `rounded-lg`, `p-4`, etc.
- Use shadcn/ui components and their documented props.
- Use CSS variables defined in `global.css` indirectly via Tailwind theme bindings.

### 2.3 Forbidden Styling

You **must not**:

- Use `style={{ ... }}` inline styles in React components.
- Use Tailwind arbitrary values such as:
  - `text-[#123456]`
  - `mt-[13px]`
  - `w-[37rem]`
  - `shadow-[0_0_10px_rgba(0,0,0,0.2)]`
- Add new `.css` files (other than `global.css`) or ad-hoc `<style>` blocks.
- Override shadcn/ui component styles with custom CSS selectors.
- Import or configure any other styling solution (no Styled Components, Emotion, CSS Modules, SCSS, etc.) unless the user clearly requests it.

If you need a visual value that doesn't exist in the design system, **propose** adding a new token in `global.css` (and Tailwind config) but do not hardcode it directly into a component.

---

## 3. shadcn/ui & MCP Server Rules

- All UI should be built with **shadcn/ui** components.
- When creating or modifying UI with shadcn:
  - Always use the **shadcn MCP server** to:
    - discover available components and patterns,
    - add/install components to the project,
    - get up-to-date usage examples.
- Prefer composition of existing shadcn components over building from scratch.
- Only create custom components when:
  - there is no suitable shadcn component,
  - and the custom component still respects the design tokens from `global.css`.

When you need a new UI element:

1. Check if a shadcn component exists.
2. If it exists, **use that** via MCP.
3. If it doesn't exist ask first if you can create a custom component
4. Only if asked for, propose a simple custom component that:
   - uses Tailwind classes mapped to tokens, and
   - fits visually with existing shadcn components.

---

## 4. Project Structure

This repository is (or will be) organized roughly as follows. If the real project differs, **follow the existing structure**.

- `app/` or `pages/` – Next.js routes and page components
- `src/components/ui/` – shadcn/ui components and wrappers
- `src/components/` – additional app-level components
- `src/lib/` – utilities (API clients, helpers, etc.)
- `styles/global.css` – global design tokens and base styles
- `tailwind.config.{js,ts}` – Tailwind configuration and theme definitions
- `env` files – environment configuration (not committed to version control)

When adding new files:

- Keep new components in `src/components/...` (or whatever the existing pattern is).
- Keep shadcn components under the folder structure that shadcn recommends (generally `components/ui`).

---

## 5. UI / UX Guidelines

When generating or editing UI:

- Use **responsive** design by default (mobile-first).
- Follow shadcn/ui patterns for:
  - layout,
  - spacing,
  - typography,
  - states (hover, active, disabled),
  - dark mode (if present).
- Maintain accessibility:
  - Proper ARIA attributes for interactive elements,
  - Keyboard navigation support,
  - Visible focus states.

Prefer **simple, clean UI** that a non-developer can understand and tweak.

---

## 6. Convex & Data Access

- Use **Convex** as the backend for data persistence and server-side logic.
- Prefer Convex queries, mutations, and actions configured for this project.
- Do not introduce a separate backend framework (Express, Nest, etc.) unless explicitly requested.
- Respect existing conventions for:
  - collection names,
  - server functions,
  - authorization patterns in Convex functions,
  - TypeScript types.

Do **not** hardcode secrets (keys, tokens, connection strings) in source code.

---

## 7. Authentication with Clerk

- Use **Clerk** for all authentication and user session management.
- Rely on Clerk components and hooks for:
  - sign-up,
  - sign-in,
  - user profile,
  - session retrieval in server components.
- Do not write your own auth logic unless it is explicitly required and integrated with Clerk/Convex.

---

## 8. Deployment (Vercel)

- Assume this project is deployed on **Vercel**.
- Keep Next.js configuration compatible with Vercel defaults:
  - Avoid unsupported Node APIs in server components,
  - Use edge/serverless functions where appropriate.
- Do not introduce a deployment workflow that conflicts with Vercel unless the user asks.

---

## 9. Code Quality & Testing

When writing or modifying code:

- Use **TypeScript** types wherever possible (including for props and API responses).
- Keep code modular:
  - small, reusable components,
  - clear separation of concerns.
- Prefer **server components** where appropriate in Next.js, unless client-side state or effects are required.

Testing (when applicable):

- Add or update tests when changing core logic.
- Use the existing test stack (Jest, React Testing Library, etc.) if it’s already configured.
- Do not introduce a second testing framework without clear need.

---

### 9.1 Definition of Done (Implementation Discipline)

When an agent implements any roadmap item, feature, refactor, or non-trivial change, the work is only considered **done** when all of the following conditions are met:

1. **Tests and Checks Must Be Run**
   - The agent MUST run the project’s relevant test suite after implementation.
   - At minimum, run all applicable checks available in the repository, such as:
     - Unit tests
     - Integration tests
     - Linting
     - Type checking
     - Build verification
   - If no automated tests exist for the affected area, the agent MUST:
     - Run all existing checks (e.g. lint, typecheck, build), and
     - Explicitly note the absence of tests in the roadmap implementation notes.

2. **Roadmap Documentation Is Mandatory**
   - When a roadmap task or checkbox item is completed (`[ ]` → `[x]`), the agent MUST add an entry to the corresponding **Implementation notes** section in `roadmap.md`.
   - Each implementation note MUST include:
     - **What was implemented or changed**
     - **How it was verified**, including exact commands run (e.g. `pnpm test`, `npm run lint`)
     - **Any manual QA steps performed**
     - **Known limitations, follow-ups, or assumptions**, if applicable

3. **No Silent Completion**
   - Roadmap items may NOT be marked complete without accompanying implementation notes.
   - Code changes without tests or verification notes are considered incomplete, even if the code compiles.

This rule exists to ensure traceability, reproducibility, and long-term maintainability of the project.

## 10. Git & Collaboration

- Make changes in a way that would be easy to review:
  - small, focused edits,
  - clear commit messages.
- Explain in comments (where helpful) how to adjust things for a non-developer:
  - e.g. “Change this label text here”,
  - “To add another navigation item, copy this object and update the title and href”.

---

## 11. Security & Secrets Management

Security rules are **mandatory** and take precedence over convenience.

- **Secrets handling**
  - Never hardcode API keys, database passwords, JWT secrets, or any sensitive tokens in the codebase.
  - Always read secrets from environment variables (e.g. `.env.local`) or the platform’s secret manager (Vercel env vars, Convex/Clerk dashboards).
  - Do not log secrets or full tokens to the console, logs, or error messages.

- **Authentication & authorization**
  - Trust **Clerk** as the source of truth for user identity.
  - On the server side, always validate the authenticated user before accessing or mutating protected data.
  - On the database side, rely on **Convex authorization** in queries/mutations/actions, and design access so users can only access their own data.

- **Input validation**
  - Validate and sanitize all user input before using it in database queries, external API calls, or rendering dynamic HTML.
  - Avoid constructing SQL, URLs, or paths directly from untrusted input; use parameterization or library helpers.

- **Error handling**
  - Do not expose internal details (stack traces, SQL queries, secret values) in error messages returned to the client.
  - Log useful information for debugging on the server side only, without leaking sensitive data.

- **Dependencies**
  - Prefer widely-used, reputable packages.
  - Avoid adding new security-sensitive dependencies (e.g. custom crypto/auth libraries) unless absolutely necessary and explicitly requested.

If a requested change conflicts with these security rules, prefer the **more secure** option and, if needed, explain the safer alternative.

---

## 12. How to Run the Project (Typical Flow)

If not otherwise specified, assume a standard workflow like:

1. Install dependencies
   - `npm install` or `pnpm install` or `yarn` (follow existing lockfile).
2. Start dev server
   - `npm run dev`
3. Run tests (if configured)
   - `npm test` or `npm run test`
4. Build for production
   - `npm run build`

Always check existing scripts in `package.json` before adding new ones.

---

## 13. Conflict Resolution & Priorities

When there are conflicting instructions:

1. **User’s explicit request** (most recent message)
2. This `AGENTS.md` file (project rules)
3. Default conventions of the frameworks (Next.js, Tailwind, shadcn/ui, Convex, Clerk)

When in doubt:

- Choose the option that:
  - keeps styling inside Tailwind + `global.css`,
  - uses shadcn/ui via MCP,
  - avoids introducing new libraries or one-off styles,
  - and **maintains or improves security**.
