# Testing Guide

This document summarizes how to run automated tests locally after the dashboard implementation.

## 1. Linting

```bash
npm run lint
```

Runs ESLint across the project.

## 2. End-to-End Tests (Playwright)

### 2.1 Install Browsers

Run once per machine:

```bash
npx playwright install --with-deps
```

### 2.2 Environment Variables

Playwright starts `npm run dev` automatically. Ensure all variables listed in `docs/SETUP.md` are present in `.env.local` (Clerk + Supabase keys). Authenticated dashboard tests can be added later; the default suite currently verifies the public landing page loads.

### 2.3 Execute the Suite

```bash
npm run test:e2e
```

Options:
- Use an existing dev server by setting `PLAYWRIGHT_BASE_URL=http://localhost:3000` and starting `npm run dev` manually; Playwright will reuse it.
- Generate an HTML report via `npx playwright show-report` after a run.

### 2.4 Adding Dashboard Tests

1. Seed deterministic Supabase data (see `docs/supabase.md#6-dashboard-metrics-testing`).
2. Create Clerk test users with stable credentials for automation.
3. Store their JWT/API keys as environment variables consumed in new tests (e.g. `E2E_CLERK_SESSION_TOKEN`).
4. Use Playwright’s `page.context().addCookies()` or Clerk test helpers to authenticate before navigating to `/app`.

## 3. Manual QA

Follow the checklist in `docs/supabase.md#6-dashboard-metrics-testing` to compare Supabase SQL outputs with on-screen values and to validate French copy/responsiveness.
