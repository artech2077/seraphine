# Seraphine MVP Roadmap

This roadmap follows the PRD and builds the product module-by-module with local demo data first. It then layers in authentication, database integration, and deployment.

## Phase 0 — Foundations
- [x] Confirm global layout and navigation structure (sidebar zones, collapsed state, mobile toggle).
- [x] Align on module order for UI delivery (suggested below).
- [x] Set up shared UI patterns:
  - [x] Page shell layout
  - [x] Page headers
  - [x] Filters bar
  - [x] Tables
  - [x] Modals
  - [x] Tabs

## Phase 1 — UI-First (Local Demo Data)
- [ ] Build each module with static/local data to validate UX, flows, and layout consistency.

1. [x] **Ventes (Sales)**
   - [x] **POS tab**: product search input, cart table, discount controls, totals, payment method, and save action (no real persistence).
   - [x] **Historique tab**: expandable sales table with nested line items and action buttons (edit/delete/download placeholders).

2. [ ] **Inventaire (Inventory)**
   - [ ] Inventory table with filters and columns from PRD.
   - [ ] Add/Edit product modal UI with validation states.

3. [ ] **Achats (Procurement)**
   - [ ] Tabs: Bons de commande + Bons de livraison.
   - [ ] Draft/order/delivered status UI and item list editor.

4. [ ] **Fournisseurs (Suppliers)**
   - [ ] List view with filters and balance color logic.
   - [ ] Supplier detail modal or drawer UI.

5. [ ] **Clients (Client Credit)**
   - [ ] Credit status table with plafond/encours visual states.
   - [ ] Status badges (OK / Surveille / Bloque).

6. [ ] **Reconciliation caisse (Cash)**
   - [ ] Expected vs actual cash form and discrepancy output.

7. [ ] **Rapports + Analytique (Reports/Analytics)**
   - [x] Placeholder layouts and empty states for future charts and exports.

8. [ ] **Dashboard (Tableau de bord)**
   - [ ] High-level KPI cards, quick links, and recent activity placeholders.
   - [ ] Establish the standard page header + filter layout.

## Phase 2 — Authentication & Roles
- [ ] Integrate Clerk auth and org context.
- [ ] Role-based access for modules (Owner, Pharmacist, Restricted).
- [ ] Session-aware layout and protected routes.

## Phase 3 — Database & Business Logic (Supabase)
- [ ] Implement tables and RLS policies from PRD schema.
- [ ] Replace local data with Supabase queries and mutations.
- [ ] Implement RPC for pricing, VAT, discounts, and credit updates.
- [ ] Wire POS flow to update inventory and client balances.

## Phase 4 — QA, Performance, and Deployment
- [ ] Seed demo data and validate edge cases.
- [ ] Add tests for critical flows (POS calculations, inventory updates).
- [ ] Prepare Vercel deployment and environment variables.
- [ ] Production build verification and monitoring setup.

## Suggested Module Order Rationale
- [ ] Start with **Ventes** and **Inventaire** for the core workflow.
- [ ] Add **Achats** and **Fournisseurs** to complete stock lifecycle.
- [ ] Add **Clients** and **Reconciliation** for financial controls.
- [ ] Keep **Dashboard** last after other modules stabilize.
