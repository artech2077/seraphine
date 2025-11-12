# AGENTS.md

## Project Overview  
This repository uses the following primary stack:  
- Front-end: **Next.js**  
- Styling: **Tailwind CSS**  
- UI components: **shadcn/ui** (via the shadcn MCP server)  
- Backend/database/authentication: **Supabase** + **Clerk**  
- Deployment: **Vercel**  
- **Unless explicitly instructed otherwise**, no other UI component library or styling framework may be introduced.

---

## UI Stack Rule  
- All styling must use **Tailwind CSS** utility classes.  
- All UI components must come from **shadcn/ui** (installed and managed via the shadcn MCP server).  
- No other UI component libraries or design systems are permitted unless explicitly approved.  
- When adding a component via shadcn/ui, follow standard installation and usage patterns (see shadcn documentation).  
- If a component is *not available* via shadcn, document the justification and ensure it aligns visually and semantically with existing styling.

---

## Project Structure & Naming  
- Root directory includes this file (`AGENTS.md`), `README.md`, etc.  
- `app/` or `pages/` (depending on router choice): Next.js page files.  
- `src/components/ui/`: Folder for shadcn/ui components and any custom UI wrappers.  
- Naming conventions:  
  - Use **PascalCase** for React component names (e.g., `LoginForm.tsx`).  
  - Use consistent kebab-case (or another agreed format) for file names.  
- Tailwind classes should follow a consistent ordering (layout → typography → color → spacing) and grouping.

---

## UI / UX Requirements  
- Use shadcn UI component patterns for responsiveness, theming, accessibility.  
- Ensure all interactive components have proper ARIA attributes, focus states, keyboard navigation.  
- For dark/light mode support or theming, leverage shadcn’s theming approach and Tailwind’s dark mode utilities.  
- Any deviation from default styling (e.g., custom colors or fonts) should be applied via theme configuration (Tailwind config) and documented.

---

## Authentication & Data Flow  
- Use Clerk SDK for authentication flows.  
- Use Supabase for data storage, backend APIs, and real-time features.  
- Secure environment variables (e.g., `.env.local`) and do **not** commit secrets to version control.

---

## Deployment & Environments  
- Deploy to Vercel by default.  
- Maintain separate environments (development, staging, production) with correct environment configurations.  
- Ensure build & deploy commands succeed without errors.

---

## Version Control & Pull Requests  
- Use `main` branch for production-ready code; create feature branches for new work (e.g., `feature/new-dashboard`).  
- Commit messages: Prefix with scope (e.g., `ui: add login form using shadcn Button`).  
- Pull requests should include:  
  - Description of what was changed  
  - Preview link or screenshots (if UI change)  
  - Mention of any new shadcn components used.

---

## Code Quality & Testing  
- Configure ESLint + Prettier for consistent formatting.  
- Write unit tests for logic; UI components should include snapshot tests and accessibility checks where appropriate.  
- When using shadcn components, ensure correct import paths and props as per documentation.

---

## Documentation & Onboarding  
- Update `README.md` or project wiki with: how to run the project, how to add new components, how to deploy.  
- In this `AGENTS.md`, include instructions for developers/AI agents:  
  - How to start the project (e.g., `npm install` → `npm run dev`)  
  - How to add new shadcn components (via `npx shadcn add <component>`)  
  - How to run tests  
  - How to deploy and trigger deploys  
- If any deviation from the standard stack occurs (e.g., another library used), document why and how.

---

## Exceptions & Overrides  
- If you must use a library **outside** of the standard stack (for example a charting library, map library), you must:  
  1. Provide justification in documentation.  
  2. Ensure styling and visual integration align with Tailwind + shadcn design system.  
  3. Isolate the deviation (e.g., in `src/components/external/`) so it’s clear which parts follow the standard rules and which are exceptions.
