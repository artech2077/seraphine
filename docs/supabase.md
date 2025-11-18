# Supabase Integration Guide

Seraphine relies on Supabase for PostgreSQL, RPC functions, and typed clients. This document summarizes the schema, helper functions, and verification steps now that roadmap item **2.1 – Supabase Integration** is implemented.

## 1. Schema Overview

`supabase/migrations/0002_initial_schema.sql` expands on the Clerk sync tables with operational data:

- **suppliers / clients** – CRM records scoped per pharmacy with running balances and contact info.
- **products** – Inventory catalog linked to suppliers with stock levels, thresholds, and SKU/barcode uniqueness per pharmacy.
- **sales / sale_items** – POS-style header + line items that capture discounts, payment types, and references to the creating user.
- **stock_movements** – Append-only log to trace every quantity change (sale, restock, adjustment).
- **cash_reconciliations** – Daily cash journal with discrepancy tracking and owner/staff attribution.
- **Enums** – `payment_type` (`cash`, `card`, `credit`) and `stock_movement_type` (`sale`, `restock`, `adjustment`).

Helper triggers keep `updated_at` fresh on suppliers, clients, products, and cash reconciliations until automated history fields (roadmap 2.3) land.

## 2. RPC Functions

### `create_sale_with_items`

- **Purpose:** Atomically create a sale, insert its line items, decrement product stock, and log stock movements.
- **Signature:** `select create_sale_with_items(p_pharmacy_id uuid, p_items jsonb, p_client_id uuid?, p_created_by uuid?, p_payment_type payment_type?, p_discount_percent numeric?, p_discount_amount numeric?, p_sale_date timestamptz?, p_notes text?);`
- **Payload:** `p_items` is a JSON array of `{ product_id, quantity, unit_price?, discount_percent?, discount_amount? }`.
- **Validation:** Ensures products belong to the pharmacy, quantity > 0, and sufficient stock exists before update.
- **Return:** Newly created `sales.id`.
- **Quick test (wrap in a transaction if running against remote):**

```sql
begin;
select create_sale_with_items(
  p_pharmacy_id => '...pharmacy uuid...',
  p_items => '[{"product_id":"...","quantity":1,"unit_price":120}]'::jsonb,
  p_created_by => '...user uuid...',
  p_payment_type => 'cash'
);
rollback;
```

### `record_cash_reconciliation`

- **Purpose:** Upsert a cash reconciliation row per pharmacy/date while auto-calculating discrepancies.
- **Signature:** `select * from record_cash_reconciliation(p_pharmacy_id uuid, p_date date?, p_opening_cash numeric?, p_system_cash_expected numeric?, p_actual_cash numeric?, p_notes text?, p_closed_by uuid?);`
- **Behavior:** Computes `discrepancy = actual_cash - system_cash_expected` and maintains the `unique (pharmacy_id, date)` constraint.
- **Return:** The full `cash_reconciliations` row.
- **Quick test:**

```sql
select *
from record_cash_reconciliation(
  p_pharmacy_id => '...pharmacy uuid...',
  p_date => current_date,
  p_opening_cash => 1200,
  p_system_cash_expected => 3500,
  p_actual_cash => 3450,
  p_closed_by => '...user uuid...'
);
```

## 3. Verification & Workflow

1. **Local stack (deferred to roadmap 7.3):**
   - Once Docker workflows are enabled, run `supabase start` and `supabase db reset --local` for offline testing.
   - Until then, rely on the hosted Supabase project for verification.
2. **Deploy schema changes:** `supabase db push` (already applied when this commit was created).
3. **Regenerate types:** `supabase gen types typescript --project-id <ref> --schema public > types/database.ts`
4. **Clients:**
   - `lib/supabase/browser.ts` exposes `getSupabaseBrowserClient()` for RLS-aware browser code.
   - `lib/supabase/server.ts` exposes `createSupabaseServerClient()` for server components / API routes.
   - `lib/supabase/admin.ts` keeps the service-role client for background jobs.
5. **Environment variables:** Keep `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (and optional `SUPABASE_LOCAL_URL`) aligned across `.env.local`, Vercel, and Supabase dashboard variables.

Follow these steps any time a migration or RPC changes to stay in sync locally and remotely.
