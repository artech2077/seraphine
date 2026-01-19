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
- [x] Client selection
- [x] Payment method selector
- [x] VAT breakdown

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

**Implementation notes:**

>

---

## Phase 3 — Auth, Orgs & Roles (Later)

**Goal:** Add Clerk auth + Organizations and enforce role-based access so each pharmacy’s data and actions are correctly scoped and protected.

### 3.1 Authentication (Clerk)

**Goal:** Require sign-in for protected areas and provide a basic signed-in user menu.

- [x] Clerk setup
- [x] Public vs protected routes
- [x] User menu in header

**Implementation notes:**

> - Added Clerk provider at the root layout and Clerk auth routes under `app/(public)/sign-in` and `app/(public)/sign-up`.
> - Added Clerk middleware to protect non-public routes under `/app` and leave `/`, `/sign-in`, `/sign-up` public.
> - Added a signed-in user menu in the header with settings link and sign-out action in `components/layout/user-menu.tsx`, wired into `components/layout/site-header.tsx`.
> - How verified: `pnpm lint`, `pnpm build` (fails: missing Clerk publishable key env during prerender).
> - Manual QA: not run (auth requires local Clerk keys).

### 3.2 Organization context

**Goal:** Ensure users operate inside the correct pharmacy org and can create/select an organization.

- [x] Enforce organization membership
- [x] Create/select organization flow

**Implementation notes:**

> - Added organization gate in `proxy.ts` to redirect signed-in users without an active org to `/app/parametres?tab=pharmacies`.
> - Added the organization management UI to the Pharmacies tab in `features/parametres/parametres-page.tsx` (switcher + list).
> - Updated the org gate in `proxy.ts` to send users without an active org to `/app/parametres?tab=pharmacies`.
> - How verified: `pnpm lint` (warnings: unused eslint-disable directives in `convex/_generated/*`), `pnpm build`.
> - Manual QA: not run (requires local Clerk keys and org setup).

### 3.3 Role-based access control

**Goal:** Define roles and restrict UI actions/routes to match the PRD (Owner/Staff/Restricted).

- [x] Define roles (Owner / Staff / Restricted)
- [x] UI permission checks
- [x] Disable/hide actions per role

**Implementation notes:**

> - Added role normalization + module permissions in `lib/auth/roles.ts` and `lib/auth/use-role-access.ts` (Owner/Staff/Restricted mapping).
> - Applied UI gating across modules: sales, inventory, purchases, suppliers, clients, reconciliation, and settings using `canManage(...)`.
> - Filtered sidebar navigation by role in `components/layout/app-sidebar.tsx` and limited Pharmacies settings to owners in `features/parametres/parametres-page.tsx`.
> - Added route-level guards in `proxy.ts` to block access to non-allowed modules based on org role.
> - Limited Restricted users to Paramètres + Assistance access and Staff users to Ventes/Inventaire/Achats/Paramètres in `lib/auth/roles.ts`.
> - Filtered search navigation results by role in `components/layout/search-command.tsx`.
> - How verified: `pnpm lint` (warnings: unused eslint-disable directives in `convex/_generated/*`), `pnpm build`.
> - Manual QA: not run (requires Clerk org roles configured).

## Phase 4 — Backend Wiring (Convex)

**Goal:** Replace UI-first mock/demo data with Convex schema + auth-aware queries/mutations that match the PRD data model.

### 4.1 Convex setup & schema

**Goal:** Create the Convex foundation and schema (products, sales, clients, suppliers, procurement) with indexes scoped per pharmacy/org.

- [x] Convex project setup
- [x] Define schema (products, sales, suppliers, etc.)
- [x] Indexes per pharmacy

**Implementation notes:**

> - Added Convex dependency and a base schema aligned to the PRD collections in `convex/schema.ts`.
> - Included supporting `pharmacies` and `users` tables for `pharmacyId` and `sellerId` references, plus relationship indexes for sale/procurement items.
> - How verified: `pnpm lint`, `pnpm build`.
> - Manual QA: not run (schema-only change).

### 4.2 Repository abstraction

**Goal:** Centralize data access per feature to keep UI components simple and make the mock → real-data migration incremental.

- [x] Create features/\*/api.ts
- [x] Replace mocks gradually

**Implementation notes:**

> - Added repository-style accessors in `features/*/api.ts` for dashboard, ventes, inventaire, achats, fournisseurs, clients, and reconciliation.
> - Moved route-level mock data into the new accessors and updated app routes to read from them.
> - How verified: `pnpm lint`, `pnpm build`.
> - Manual QA: not run (data wiring only).

### 4.3 Module wiring order

**Goal:** Wire modules in a stable order, starting with products and core entities before transactional flows and aggregates.

- [x] Inventory
- [x] Suppliers & Clients
- [x] Procurement
- [x] Sales
- [x] Cash
- [x] Dashboard aggregates

**Implementation notes:**

> - Added Convex inventory wiring: `convex/products.ts` query, `convex/pharmacies.ts` org bootstrap mutation, and a client hook in `features/inventaire/api.ts`.
> - Wrapped the app with Convex + Clerk provider in `components/providers/convex-provider.tsx` and `app/layout.tsx`.
> - Updated the inventory route to use Convex data via `features/inventaire/inventory-page.tsx` and `app/(protected)/app/inventaire/page.tsx`.
> - How verified: `pnpm lint`, `pnpm build`.
> - Manual QA: not run (requires Convex data to render).

## Phase 5 — UI Finalization (Deferred)

**Goal:** Finish remaining UI-only gaps from Phase 2 once core surfaces are stable.

### 5.1 Sales POS

**Goal:** Complete the remaining POS UI flows.

- [ ] Barcode scan auto-adds product as a sales line
- [ ] Validation + toasts

**Implementation notes:**

> - Wired Achats to Convex with `convex/procurement.ts` query and client hooks in `features/achats/api.ts`.
> - Updated Achats pages/panels to consume Convex data and show empty-state messaging when no orders are present.
> - Added inventory empty-state messaging to explain why the table is empty.
> - Wired Fournisseurs + Clients CRUD to Convex with `convex/suppliers.ts`, `convex/clients.ts`, and client hooks in `features/fournisseurs/api.ts`, `features/clients/api.ts`.
> - Hooked create/edit/delete actions in the Supplier and Client modals/tables and added empty-state messaging in `features/fournisseurs/suppliers-page.tsx` and `features/clients/clients-page.tsx`.
> - Wired Inventory CRUD to Convex with mutations in `convex/products.ts` and UI hooks in `features/inventaire/api.ts` (create/edit/delete from existing modals and menus).
> - Wired Achats create/edit/delete flows to Convex via `features/achats/api.ts` and `features/achats/procurement-order-modal.tsx`, with supplier/product options sourced from Convex.
> - Wired Sales history + POS to Convex with `convex/sales.ts` and `features/ventes/api.ts`, added delete action, and added validation/toasts in the POS flow.
> - Wired Cash reconciliation to Convex with `convex/reconciliation.ts`, added a schema table, and persisted opening/closing updates with toasts.
> - Wired Dashboard aggregates to Convex via `convex/dashboard.ts` and `features/dashboard/api.ts` (client data source).
> - How verified: `pnpm lint` (warnings: unused eslint-disable directives in `convex/_generated/*`), `pnpm build`.
> - Manual QA: not run (requires Convex data to render).

### 5.2 Procurement

**Goal:** Round out procurement UI actions.

- [ ] Send to supplier (mock)

**Implementation notes:**

>

### 5.3 Suppliers

**Goal:** Add supplier deep-dive UI.

- [ ] Supplier detail page

**Implementation notes:**

>

### 5.4 Clients

**Goal:** Complete client credit UX and detail views.

- [ ] Credit status logic
- [ ] Client detail page

**Implementation notes:**

>

### 5.5 Reports & Analytics

**Goal:** Deliver report scaffolding consistency.

- [ ] Structured report cards
- [ ] Chart placeholders

**Implementation notes:**

>

## Phase 6 — Backend Support for UI Finalization (If Needed)

**Goal:** Add minimal backend wiring required to support the deferred UI gaps.

- [ ] Define required data shapes and endpoints
- [ ] Add mock-to-Convex bridges for newly unblocked UI flows
- [ ] Validate permissions/roles for the new UI actions

**Implementation notes:**

>

## Phase 7 — Finalization

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
