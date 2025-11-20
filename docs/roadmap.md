# Seraphine – MVP Roadmap

This roadmap lists all tasks required for the MVP and describes the expected output for each item.  
All deliverables assume the existing stack: Next.js, TailwindCSS, Shadcn, Supabase, Clerk, Vercel.

---

## 1. Foundation & Setup

### 1.1 Simple Home Page with Sign In / Sign Up Buttons - Done

**Expected Output:**
- [x] Public landing page (/) with “Se connecter” and “Créer un compte”
- [x] Redirect to Clerk sign-in / sign-up pages
- [x] Fully responsive Shadcn UI layout

### 1.2 Clerk Authentication - Done

**Expected Output:**
- [x] Fully configured Clerk
- [x] Sign-in, sign-up, reset-password screens
- [x] Middleware to protect all app routes except public pages
- [x] `<UserButton />` in navbar
- [x] Session-aware layout

**Implementation Notes:**
- ClerkProvider with French localization wraps the app, reading keys from `.env.local` and failing fast when missing.
- Public auth flows mapped to `/sign-in`, `/sign-up`, and custom `/reset-password` (email code strategy) built with shadcn inputs.
- `proxy.ts` runs Clerk middleware and calls `auth.protect()` for every non-public route.
- Global `<SiteHeader />` renders `<UserButton />` plus session-aware CTAs; landing page toggles buttons based on `<SignedIn />` / `<SignedOut />`.

### 1.3 Link Clerk Accounts to Supabase Users - Done

**Expected Output:**
- [x] users table populated automatically on first login
- [x] clerk_id stored and uniquely enforced
- [x] Role assignment logic (owner/staff)
- [x] Mapping between Clerk Organization and Pharmacy

**Implementation Notes:**
- `supabase/migrations/0001_link_clerk_users.sql` adds `users`, `pharmacies`, `pharmacy_memberships`, and the `user_role` enum with unique constraints.
- `lib/supabase/admin.ts` provides the service-role client and `lib/clerk/sync.ts` handles Clerk webhook events (user/org/membership create/update/delete).
- Webhook endpoint lives at `app/api/webhooks/clerk/route.ts`, secured via `svix` and `CLERK_WEBHOOK_SECRET`.
- Runbook + env requirements documented in `docs/auth-sync.md`.

### 1.4 Setup Documentation - Done

**Expected Output:**  
File: docs/SETUP.md  
Contains:
- [x] Node version
- [x] Supabase CLI installation + login
- [x] Clerk setup instructions
- [x] .env.local structure
- [x] How to run dev / build / deploy
- [x] First-time DB migration instructions

**Implementation Notes:**
- `docs/SETUP.md` now outlines prerequisites, CLI steps, env var template, Clerk guidance, project commands, and migration/type-generation instructions referenced by the auth sync work.

### 1.5 Production Deployment (Vercel) - Done

**Expected Output:**
- [x] Vercel deployment connected to Git repo
- [x] Environment variables configured
- [x] Supabase & Clerk keys set
- [x] Build logs clean
- [x] Successful smoke test for main flows
- [x] Run the Clerk ↔ Supabase webhook test checklist once deployment is live (see `docs/auth-sync.md`)

**Implementation Notes:**
- `docs/deployment.md` documents the end-to-end workflow: Vercel project creation, env var configuration, Clerk webhook setup, build commands, smoke tests, and the post-deploy checklist referencing `docs/auth-sync.md`.
- User action required: execute the documented steps (Vercel dashboard, Clerk webhook, Supabase verification) when ready; repository already contains code + instructions.

---

## 2. Database & Security

### 2.1 Supabase Integration - Done

**Expected Output:**
- [x] Environment-based Supabase client
- [x] Initial schema deployed
- [x] RPC functions working in local & cloud
- [x] .env with all Supabase configs
- [x] Database typings generated for TypeScript
- [ ] Supabase tests executed (`create_sale_with_items` + `record_cash_reconciliation` per `docs/supabase.md`)

**Implementation Notes:**
- `lib/supabase/env.ts`, `browser.ts`, and `server.ts` expose typed clients backed by `@supabase/ssr`, while `admin.ts` continues to handle service-role access.
- `.env.local.example` plus updated `docs/SETUP.md` enumerate every Supabase + Clerk variable (including optional `SUPABASE_LOCAL_URL`).
- Migration `0002_initial_schema.sql` creates suppliers, clients, products, sales, sale_items, stock_movements, cash_reconciliations, and RPC helpers (`create_sale_with_items`, `record_cash_reconciliation`). Applied via `supabase db push`.
- Types regenerated via `supabase gen types ... > types/database.ts`; `docs/supabase.md` documents verification queries and workflow.

### 2.2 Enable Row Level Security (RLS) - Done

**Expected Output:**
- [x] RLS ON for all tables
- [x] Policies ensuring each pharmacy can only access its own data (pharmacy_id match)
- [x] Owner override permission
- [x] Staff restricted to allowed actions
- [x] Supabase tests covering authenticated (owner/staff) vs anonymous access

**Implementation Notes:**
- Migration `0003_enable_rls.sql` enables RLS and adds helper functions (`current_jwt_claims`, `current_app_user_id`, `has_pharmacy_role`, `user_can_access_sale`) to evaluate Clerk-issued identities.
- Owner/staff/restricted access policies now exist for `pharmacies`, `users`, `pharmacy_memberships`, `suppliers`, `clients`, `products`, `sales`, `sale_items`, `stock_movements`, and `cash_reconciliations`. Owners manage master data, staff handle operational records, restricted roles read only.
- RPCs (`create_sale_with_items`, `record_cash_reconciliation`) enforce the same role checks before running security-definer logic.
- RLS validation steps and JWT simulation instructions live in `docs/supabase.md`.

### 2.3 Automated Historical Fields - Done

**Expected Output:**  
Triggers that automatically update:
- [x] last_purchase on products
- [x] last_delivery
- [x] Supplier/client balance recalculations
- [x] Stock movement log creation
- [x] Supabase tests confirming triggers fire on insert/update operations

**Implementation Notes:**
- Migration `0004_automated_history.sql` introduces ledger enums/tables (`client_balance_events`, `supplier_balance_events`) plus `refresh_*` triggers so denormalized `clients.balance` and `suppliers.balance` always match event sums. Supabase policies restrict writes to owners while staff can read.
- Product history fields now update automatically: sale item triggers recompute `products.last_purchase`, and stock movement triggers recompute `last_delivery` whenever a restock/positive adjustment lands.
- Any manual `products.stock` update emits an `adjustment` row in `stock_movements` (unless the caller sets the `seraphine.skip_stock_movement_trigger` flag). The `create_sale_with_items` RPC sets this flag while it performs its own stock logging to avoid duplicates.
- Credit sales automatically append a `client_balance_events` row, ensuring customer balances grow when payment_type=`credit`.
- Added Supabase test snippets to `docs/supabase.md` covering sale inserts, credit balances, and simulated restock adjustments to validate the triggers end-to-end.

---

## 3. Core Product Modules

### 3.1 Dashboard - Done

**Expected Output:**
- [x] Overview cards (Sales Today, Stock Alerts, Forecast)
- [x] Quick links to Sales, Inventory, Suppliers, Clients
- [x] French-localized interface
- [x] Data pulled via Supabase queries and caches
- [x] Supabase dashboard query tests (ensure anon client can fetch aggregates per RLS)

**Implementation Notes:**
- Added Supabase RPC helpers (`get_sales_summary`, `get_sales_forecast`, `get_stock_alert_snapshot`) plus typed wrappers in `lib/dashboard/queries.ts` so the KPI cards are backed by live data with graceful fallbacks.
- Built a Shadcn-based dashboard overview grid featuring metric cards inspired by `dashboard-01`, translucent cards, French copy, and trend badges that switch colors based on movement.
- Integrated quick-action links and a detailed stock-alert list into `app/(protected)/app/page.tsx`, showing a friendly placeholder until backend modules ship.
- Extended `docs/supabase.md` with SQL snippets + QA steps so the dashboard queries can be validated manually, and ensured the UI remains responsive/dark-mode friendly.

### 3.2 Sales Module (POS-Like Interface) - TO DO

#### 3.2.1 Handle Sale Line Items

**Expected Output:**
- [ ] Sale form with product search, quantity, price
- [ ] Line-level + sale-level discounts (percentage or fixed amount)
- [ ] Payment types: cash, card, credit
- [ ] Automatic calculation of totals
- [ ] Full French UI
- [ ] Optimistic UI updates

#### 3.2.2 RPC: create_sale_with_items

**Expected Output:**
Atomic transaction that:
- [ ] Creates sale
- [ ] Creates sale_items
- [ ] Applies discounts
- [ ] Logs inventory_movements
- [ ] Decrements stock
- [ ] Updates client balance (if credit)
- [ ] Error-safe rollback behavior

#### 3.2.3 Barcode Scanner Support

**Expected Output:**
- [ ] Input automatically focused on product search
- [ ] USB scanner triggers quick lookup
- [ ] Product auto-added with qty = 1

### 3.3 Cash Reconciliation Workflow - TO DO

#### 3.3.1 Opening Cash (“Fond de caisse”)

**Expected Output:**
- [ ] Morning input for opening cash
- [ ] Saved in cash_reconciliations
- [ ] Cannot close the day without it

#### 3.3.2 End-of-Day Reconciliation

**Expected Output:**
- [ ] Expected total = opening cash + sales – payouts + adjustments
- [ ] Actual cash input
- [ ] Discrepancy displayed and logged
- [ ] Final stored record for daily report

### 3.4 Inventory Management - TO DO

#### 3.4.1 Core Inventory

**Expected Output:**
- [ ] Product list with filters: supplier, category, low stock
- [ ] Add/edit product modal
- [ ] Real-time stock updates

#### 3.4.2 Automatic Inventory Movements

**Expected Output:**
- [ ] All stock-ins and stock-outs logged in inventory_movements
- [ ] Movement types: sale, purchase, adjustment, preparation
- [ ] Linked to reference transaction ID

#### 3.4.3 Stock Alerts

**Expected Output:**
- [ ] Low-stock indicators
- [ ] Dashboard widget listing at-risk products
- [ ] Click-through to reorder or adjust stock

### 3.5 Procurement

#### 3.5.1 Purchase Orders

**Expected Output:**
- [ ] PO creation screen (draft or confirmed)
- [ ] Add multiple items
- [ ] Print/export PO

#### 3.5.2 Delivery Notes

**Expected Output:**
- [ ] Receive goods based on PO or without PO
- [ ] Increment stock
- [ ] Update cost price
- [ ] Update supplier balance
- [ ] Create inventory movement record

### 3.6 Supplier Management - TO DO

**Expected Output:**
- [ ] Supplier list  
Supplier profile with:
- [ ] Balance
- [ ] Delivery notes
- [ ] Purchase orders
- [ ] Payments
- [ ] Ability to add/edit/delete suppliers
- [ ] Automatic balance tracking

### 3.7 Client Management - TO DO

**Expected Output:**
- [ ] Client list  
Client profile: credit limit, balance, sales, payments
- [ ] Process credit payments
- [ ] Auto-updated balance

### 3.8 Pharmaceutical Preparation - TO DO

**Expected Output:**
- [ ] Create preparation batch
- [ ] Select ingredients (products) + quantities
- [ ] Deduct ingredients from stock
- [ ] Create prepared product stock
- [ ] Log all movements
- [ ] Assign batch number & date

---

## 4. Data & Imports

### 4.1 Inventory Import & Demo Data - TO DO

**Expected Output:**
- [ ] CSV Template (Products)
- [ ] Upload UI with preview and error highlights
- [ ] Import pipeline with validation
- [ ] Optional demo pharmacy data (sample products, suppliers, clients)

### 4.2 Full Data Import - TO DO

**Expected Output:**  
Support for CSV import of:
- [ ] Products
- [ ] Suppliers
- [ ] Clients
- [ ] Sales history  

Includes:
- [ ] Error logs
- [ ] Preview before commit
- [ ] Row-by-row validation

---

## 5. Intelligence & Reporting

### 5.1 Forecasting - TO DO

**Expected Output:**
- [ ] Supabase Edge Function running moving average model
- [ ] Daily forecast stored in forecasts
- [ ] Dashboard display: predicted sales + confidence interval
- [ ] Supabase Edge Function tested via run + datastore verification

### 5.2 Profit & Loss Reporting - TO DO

**Expected Output:**
- [ ] Summary of revenue, COGS, margin
- [ ] Filters: day, week, month
- [ ] Breakdown by product category and supplier
- [ ] Export CSV

### 5.3 Accounting Reports - TO DO

**Expected Output:**
- [ ] Journals
- [ ] Ledgers
- [ ] Balances
- [ ] CSV export compatible with Moroccan accountants

### 5.4 Table Filters - TO DO

**Expected Output:**  
Fully functional filters for:
- [ ] Date
- [ ] Supplier
- [ ] Category
- [ ] Product  
Works across Sales, Inventory, Suppliers.

---

## 6. UX & Product Experience

### 6.1 Guided Onboarding Wizard - TO DO

**Expected Output:**  
3-step setup:
- [ ] Pharmacy details
- [ ] Products import/add
- [ ] Suppliers setup  
- [ ] Shows progress and allows skipping (but warns user).

---

## 7. Monitoring & Deployment

### 7.1 Monitoring - TO DO

**Expected Output:**
- [ ] Sentry configured (frontend + backend)
- [ ] Supabase observability: logs, performance dashboard
- [ ] Error boundaries in UI
- [ ] Supabase log streaming tested (admin client + Studio)

### 7.2 Clerk Production Cutover - TO DO

**Expected Output:**
- [ ] Clerk Production instance created once the MVP is stable
- [ ] Production publishable + secret keys configured in Vercel (all scopes) and `.env` templates
- [ ] Production webhook + secret pointing to `/api/webhooks/clerk`
- [ ] Development instance retained for localhost testing

**Implementation Notes:**
- This is a future task; for now we intentionally run every environment (local + Vercel dev/preview/prod) on the Clerk Development instance.
- When the cutover is scheduled, update `docs/SETUP.md` and `docs/deployment.md` with the new instructions and rotate the secrets accordingly.

### 7.3 Supabase Local Stack (Docker) - TO DO

**Expected Output:**
- [ ] Documented Docker Desktop install & prerequisites
- [ ] `supabase start` workflow verified locally
- [ ] Local database reset instructions incorporated into docs
- [ ] Automated checks ensuring migrations run both locally and remotely
- [ ] Supabase local smoke test (migrations + RPCs run inside Docker stack)

**Implementation Notes:**
- Deferred until Docker can be adopted; for now all database validation happens against the linked cloud project. Once item 7.3 is complete, re-enable the local-only steps referenced in `docs/supabase.md` and `docs/SETUP.md`.

## Summary Overview Table

| Roadmap Item | Expected Output |
|--------------|----------------|
| [ ] Home page | Landing page with Sign-in/Sign-up |
| [ ] Auth | Full Clerk integration |
| [ ] Clerk ↔ Supabase | User profile sync, roles, orgs |
| [ ] Setup docs | docs/SETUP.md |
| [x] Supabase integration | DB, RPC, types, env |
| [x] RLS | Isolation per pharmacy |
| [ ] Inventory import | CSV + validation |
| [ ] Sales with line items | POS-like form + RPC |
| [ ] Discounts | % or amount, line or sale |
| [ ] Barcode support | Auto-lookup via scanner |
| [ ] Opening cash | Morning cash entry |
| [ ] Closing cash | Expected vs actual vs discrepancy |
| [ ] Supplier mgmt | Profiles, balances, POs |
| [ ] Client mgmt | Credit tracking |
| [ ] Purchase orders | Create, store, export |
| [ ] Delivery notes | Stock-in + cost update |
| [ ] Pharmaceutical prep | Batch creation & stock movement |
| [ ] Reporting | P&L, accounting, stock |
| [ ] Forecasting | Daily moving-average model |
| [ ] Monitoring | Sentry + logs |
| [ ] Deployment | Vercel production |
| [ ] Supabase local stack | Docker-based local DB |
| [ ] Clerk production cutover | Switch all scopes to the Clerk Production instance once the MVP is stable |
