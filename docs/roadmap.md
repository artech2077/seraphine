# 📍 Seraphine MVP – Development Roadmap (UI-first)

> **Status legend**
>
> - [ ] Not started
> - [x] Completed
> - [~] In progress

---

## Phase 0 — Clean Project Setup (FOUNDATION)

**Goal:** Establish a clean, consistent foundation (routing, folders, tooling, and config) so all UI modules can be built quickly and safely.

### 0.1 Normalize project structure & routing

**Goal:** Make routing and folders predictable so each PRD module maps cleanly to a route and a `features/*` area.

- [x] Create route groups (`(public)`, `(protected)/app`)
- [x] Create `features/*` folders per module
- [x] Create shared `components/*` structure (layout, tables, forms, filters)
- [x] Create `lib/*` structure (mock, utils, constants, validators)

**Implementation notes:**

> - Added route groups `app/(public)` and `app/(protected)/app`, with `/` redirecting to `/app`.
> - Moved all app routes under `app/(protected)/app/*` and updated navigation links to `/app/*`.
> - Reorganized shared UI into `components/layout`, `components/tables`, `components/forms`, `components/filters`.
> - Split feature modules into `features/*` and updated imports accordingly.
> - Normalized lib structure under `lib/constants`, `lib/utils`, `lib/mock`, `lib/validators`.

---

### 0.2 Tooling & baseline dependencies

**Goal:** Ensure consistent patterns for forms, tables, state, validation, and developer tooling to speed up UI delivery.

- [x] ESLint + Next.js config
- [x] Prettier
- [x] Husky + lint-staged
- [x] zod
- [x] react-hook-form + resolvers
- [x] @tanstack/react-table
- [x] zustand
- [x] sonner (toasts)
- [x] Base PageShell / PageHeader / ContentCard components

**Implementation notes:**

> - ESLint already configured via `eslint.config.mjs` (Next.js core-web-vitals + TS).
> - Added Prettier config: `.prettierrc` and `.prettierignore`.
> - Added Husky with `prepare` script and `.husky/pre-commit` running `lint-staged`.
> - Added deps: `zod`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-table`, `zustand`, `sonner`.
> - Added `ContentCard` alongside existing `PageShell` and `PageHeader`.

---

### 0.3 Environment & config hygiene

**Goal:** Keep environment/config clean and reproducible for local dev + Vercel (no secrets committed; defaults centralized).

- [x] `.env.local.example`
- [x] `docs/SETUP.md`
- [x] `config/app.ts` (app name, locale, VAT defaults)

**Implementation notes:**

> - Added `.env.local.example` with Clerk + Convex placeholders.
> - Added `docs/SETUP.md` with install/run/env steps.
> - Added `config/app.ts` for app name, locale, currency, and VAT defaults.

---

## Phase 1 — Global UX & Navigation

**Goal:** Implement the PRD global layout/navigation (sidebar with clear active states) to make every module reachable and consistent.

### 1.1 Sidebar layout

**Goal:** Match the PRD sidebar requirements (3 zones, active state, and consistent navigation entry points).

- [x] Sidebar with 3 zones
- [x] Active state styling

**Implementation notes:**

>

---

## Phase 2 — Core Modules (UI-first)

**Goal:** Deliver the full PRD module surface area as high-fidelity UI (POS, inventory, procurement, suppliers, clients, cash reconciliation, dashboard, reports/analytics) before backend wiring.

### 2.1 Ventes (Sales – POS)

**Goal:** Provide the PRD POS flow UI: product input (search/barcode), cart totals, optional client, payment method, and clear VAT breakdown.

- [x] POS cart UI
- [ ] Barcode input flow
- [x] Client selection
- [x] Payment method selector
- [x] VAT breakdown
- [ ] Validation + toasts

**Implementation notes:**

> - Verified POS cart, client selection, payment selector, and VAT summary in `features/ventes/sales-pos.tsx`.
> - How verified: manual code review (no commands run).

---

### 2.1 Historique des ventes

**Goal:** Provide a sales history UI aligned with the PRD: sortable table, expandable rows with item details, and action entry points.

- [x] Sales history table
- [x] Expandable rows
- [x] Nested items table
- [x] Filters
- [x] Action menu

**Implementation notes:**

> - Verified nested line-item table and expandable rows in `features/ventes/sales-history-table.tsx`.
> - Verified filters bar and controls in `features/ventes/sales-history-panel.tsx`.
> - Verified action menu items in `features/ventes/sales-history-table.tsx`.
> - How verified: manual code review (no commands run).

---

### 2.2 Inventaire

**Goal:** Provide an inventory dashboard UI aligned with the PRD: filters, columns, and product CRUD covering all required fields.

- [x] Inventory table
- [x] Add/Edit modal
- [x] Complete PRD fields
- [x] Filters
- [x] Stock badges
- [x] Delete confirmation
- [x] Export placeholder

**Implementation notes:**

> - Verified PRD fields in modal in `features/inventaire/inventory-product-modal.tsx`.
> - Verified filters, print, and export flow in `features/inventaire/inventory-page.tsx`.
> - Verified stock badges and delete confirmation in `features/inventaire/inventory-table.tsx`.
> - How verified: manual code review (no commands run).

---

### 2.3 Achats (Procurement)

**Goal:** Provide procurement UI aligned with the PRD workflows (purchase orders + delivery notes) with clear statuses and supplier selection.

- [x] Orders UI
- [x] Status chips
- [x] Supplier selection
- [ ] Send to supplier (mock)

**Implementation notes:**

> - Verified status badges in `features/achats/achats-purchase-orders-table.tsx` and `features/achats/achats-delivery-notes-table.tsx`.
> - Verified supplier selection in `features/achats/procurement-order-modal.tsx`.
> - How verified: manual code review (no commands run).

---

### 2.4 Fournisseurs

**Goal:** Provide supplier management UI aligned with the PRD: list + filters, clear balance display, and create/edit supplier details.

- [x] Supplier list
- [x] Balance logic
- [x] Filters
- [x] Supplier form
- [ ] Supplier detail page

**Implementation notes:**

> - Verified filters and list UI in `features/fournisseurs/suppliers-page.tsx`.
> - Verified balance color logic in `features/fournisseurs/suppliers-table.tsx`.
> - Verified supplier form modal in `features/fournisseurs/supplier-modal.tsx`.
> - How verified: manual code review (no commands run).

---

### 2.5 Clients

**Goal:** Provide client credit management UI aligned with the PRD: plafond/encours visibility, status logic, and client create/edit flows.

- [x] Client list
- [x] Status badges
- [x] Client form
- [ ] Credit status logic
- [ ] Client detail page

**Implementation notes:**

> - Verified client list, status badges, and sorting in `features/clients/clients-table.tsx`.
> - Verified client form modal in `features/clients/client-modal.tsx`.
> - How verified: manual code review (no commands run).

---

### 2.6 Réconciliation caisse

**Goal:** Provide the PRD cash reconciliation UI flow: opening cash, expected vs actual, discrepancy, and day locking.

- [x] Opening cash
- [x] Expected cash
- [x] Actual cash
- [x] Discrepancy calc
- [x] Lock day

**Implementation notes:**

> - Added the cash reconciliation dashboard cards (date selector, opening/closing inputs, expected total, dynamic result state) in `features/reconciliation/reconciliation-dashboard.tsx`.
> - Added the reconciliation history table with filters, status chips, and action menu in `features/reconciliation/reconciliation-history-panel.tsx` and `features/reconciliation/reconciliation-history-table.tsx`.
> - Wired mock data into the route at `app/(protected)/app/reconciliation-caisse/page.tsx` and composed everything in `features/reconciliation/reconciliation-page.tsx`.
> - Added warning status tokens in `app/globals.css` and a `warning` badge variant in `components/ui/badge.tsx` for surplus states.
> - How verified: `pnpm lint`, `pnpm build` (fails: `components/ui/modal.tsx` type error, pre-existing).
> - Manual QA: not run (UI-only changes).

---

### 2.7 Dashboard

**Goal:** Provide an at-a-glance dashboard UI aligned with PRD navigation and success metrics (KPIs, widgets, and quick actions).

- [x] KPI cards
- [x] Low stock widget
- [x] Recent sales widget
- [x] Quick actions

**Implementation notes:**

> - Added the dashboard layout with KPI cards, quick action buttons, trend chart, and operational widgets in `features/dashboard/dashboard-page.tsx`.
> - Wired mock dashboard data into `app/(protected)/app/page.tsx` to populate sales trends, alerts, recent sales, and orders.
> - How verified: `pnpm lint`, `pnpm build` (fails: `features/achats/procurement-order-modal.tsx` Select `onValueChange` type mismatch, pre-existing).
> - Manual QA: not run (UI-only changes).

---

### 2.8 Rapports & Analytique

**Goal:** Provide report/analytics UI scaffolding (structured sections/cards) to guide future backend wiring.

- [x] Placeholders
- [ ] Structured report cards
- [ ] Chart placeholders

**Implementation notes:**

>

---

## Phase 3 — Auth, Orgs & Roles (Later)

**Goal:** Add Clerk auth + Organizations and enforce role-based access so each pharmacy’s data and actions are correctly scoped and protected.

### 3.1 Authentication (Clerk)

**Goal:** Require sign-in for protected areas and provide a basic signed-in user menu.

- [ ] Clerk setup
- [ ] Public vs protected routes
- [ ] User menu in header

**Implementation notes:**

>

### 3.2 Organization context

**Goal:** Ensure users operate inside the correct pharmacy org and can create/select an organization.

- [ ] Enforce organization membership
- [ ] Create/select organization flow

**Implementation notes:**

>

### 3.3 Role-based access control

**Goal:** Define roles and restrict UI actions/routes to match the PRD (Owner/Staff/Restricted).

- [ ] Define roles (Owner / Staff / Restricted)
- [ ] UI permission checks
- [ ] Disable/hide actions per role

**Implementation notes:**

>

## Phase 4 — Backend Wiring (Convex)

**Goal:** Replace UI-first mock/demo data with Convex schema + auth-aware queries/mutations that match the PRD data model.

### 4.1 Convex setup & schema

**Goal:** Create the Convex foundation and schema (products, sales, clients, suppliers, procurement) with indexes scoped per pharmacy/org.

- [ ] Convex project setup
- [ ] Define schema (products, sales, suppliers, etc.)
- [ ] Indexes per pharmacy

**Implementation notes:**

>

### 4.2 Repository abstraction

**Goal:** Centralize data access per feature to keep UI components simple and make the mock → real-data migration incremental.

- [ ] Create features/\*/api.ts
- [ ] Replace mocks gradually

**Implementation notes:**

>

### 4.3 Module wiring order

**Goal:** Wire modules in a stable order, starting with products and core entities before transactional flows and aggregates.

- [ ] Inventory
- [ ] Suppliers & Clients
- [ ] Procurement
- [ ] Sales
- [ ] Cash
- [ ] Dashboard aggregates

**Implementation notes:**

>

## Phase 5 — Finalization

**Goal:** Make the MVP production-ready with demo data, UX polish, exports/PDFs, and a reliable Vercel deployment.

### QA & Polish

**Goal:** Validate end-to-end flows and polish UX states (loading/empty/error) across modules.

- [ ] Seed demo data
- [ ] Error boundaries
- [ ] Empty states
- [ ] Loading skeletons

**Implementation notes:**

>

### PDFs & Exports

**Goal:** Support the PRD’s print/export needs (invoices and procurement documents) with consistent formatting.

- [ ] Invoice PDF
- [ ] Purchase order export
- [ ] Delivery note print

**Implementation notes:**

>

### Deployment

**Goal:** Ship on Vercel with correct environment variables and a verified production build.

- [ ] Vercel config
- [ ] Env validation
- [ ] Production build verification

**Implementation notes:**

>
