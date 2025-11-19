# Supabase Integration Guide

Seraphine relies on Supabase for PostgreSQL, RPC functions, and typed clients. This document summarizes the schema, helper functions, and verification steps now that roadmap item **2.1 – Supabase Integration** is implemented.

## 1. Schema Overview

`supabase/migrations/0002_initial_schema.sql` expands on the Clerk sync tables with operational data, while `0004_automated_history.sql` adds ledgers + history triggers:

- **suppliers / clients** – CRM records scoped per pharmacy with running balances and contact info; balances are now computed from ledger events (see below) instead of hand-editing the numeric field.
- **products** – Inventory catalog linked to suppliers with stock levels, thresholds, and SKU/barcode uniqueness per pharmacy. `last_purchase` and `last_delivery` are auto-managed by triggers watching `sale_items` and `stock_movements`.
- **sales / sale_items** – POS-style header + line items that capture discounts, payment types, and references to the creating user.
- **stock_movements** – Append-only log to trace every quantity change (sale, restock, adjustment). Manual `products.stock` changes emit `adjustment` rows automatically unless `set_config('seraphine.skip_stock_movement_trigger','true',true)` is set inside a privileged RPC.
- **cash_reconciliations** – Daily cash journal with discrepancy tracking and owner/staff attribution.
- **client_balance_events / supplier_balance_events** – Ledger tables that record every debit/credit per party with event types (`sale_credit`, `payment`, `purchase`, `adjustment`). Triggers recalc the denormalized `balance` column on each mutation.
- **Enums** – `payment_type`, `stock_movement_type`, `client_balance_event_type`, `supplier_balance_event_type`.

Helper triggers also keep `updated_at` fresh on suppliers, clients, products, and cash reconciliations.

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

## 3. Row Level Security Helpers

Migration `0003_enable_rls.sql` enables RLS on every operational table and adds helper functions:

- `current_jwt_claims()` → returns the JSON blob from `request.jwt.claims`.
- `current_clerk_id()` / `current_app_user_id()` / `current_user_role()` → map the authenticated Clerk id (stored in `sub` or `clerk_id`) to the internal `users` table.
- `has_pharmacy_role(pharmacy_id, allowed_roles)` → gate access by membership role; owners can mutate inventory + master data, staff can operate on sales/cash, restricted roles remain read-only.
- `user_can_access_sale(sale_id, allowed_roles)` → convenience for `sale_items` policies.

All tables now enforce:

- Membership-scoped SELECT policies (`pharmacy_id` match).
- Owner-only INSERT/UPDATE/DELETE for suppliers, clients, products, pharmacy metadata, and memberships.
- Owner/staff mutations for day-to-day records (sales, sale_items, stock_movements, cash_reconciliations).
- RPCs (`create_sale_with_items`, `record_cash_reconciliation`) short-circuit with `errcode 42501` when the caller lacks owner/staff rights.

Tokens issued to Supabase **must** include the Clerk user id in either the `clerk_id` claim or `sub` so these helpers can resolve membership. See the testing section below to simulate claims until the Clerk → Supabase exchange endpoint is implemented.

## 4. Verification & Workflow

1. **Local stack (deferred to roadmap 7.3):**
   - Once Docker workflows are enabled, run `supabase start` and `supabase db reset --local` for offline testing.
   - Until then, rely on the hosted Supabase project for verification.
2. **Deploy schema changes:** `supabase db push` (already applied when this commit was created).
3. **Regenerate types:** `supabase gen types typescript --project-id <ref> --schema public > types/database.ts`
4. **RLS simulation tests (Supabase SQL editor or psql):**

   ```sql
   -- Emulate an owner token
   select set_config(
     'request.jwt.claims',
     json_build_object('sub', '<clerk-user-id>')::text,
     true
   );

   -- Owner should see their pharmacy's products but not others
   select id, name from products;

   -- Switch to a restricted or different user
   select set_config('request.jwt.claims', json_build_object('sub', '<another-clerk-id>')::text, true);
   select id, name from products; -- expect 0 rows if no membership
   ```

   Use the same technique to test inserts (e.g., `insert into products ...`) or RPC calls: attempts from unauthorized roles will raise `42501`.

5. **Clients:**
   - `lib/supabase/browser.ts` exposes `getSupabaseBrowserClient()` for RLS-aware browser code.
   - `lib/supabase/server.ts` exposes `createSupabaseServerClient()` for server components / API routes.
   - `lib/supabase/admin.ts` keeps the service-role client for background jobs.
6. **Environment variables:** Keep `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (and optional `SUPABASE_LOCAL_URL`) aligned across `.env.local`, Vercel, and Supabase dashboard variables. Clerk → Supabase JWT exchange endpoints must mint tokens with the Clerk id mapped in `sub`/`clerk_id`.

Follow these steps any time a migration or RPC changes to stay in sync locally and remotely.

## 5. Historical Fields & Ledger Tests

Validate roadmap item 2.3 via the Supabase SQL editor (wrap everything in a transaction so you can `rollback` when done):

```sql
begin;

-- Pretend to be an owner
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '<owner-clerk-id>')::text,
  true
);

-- Seed a supplier, client, and product for this pharmacy
with sup as (
  insert into suppliers (pharmacy_id, name)
  values ('<pharmacy-id>', 'Trigger Test Supplier')
  returning id
), cli as (
  insert into clients (pharmacy_id, name)
  values ('<pharmacy-id>', 'Trigger Test Client')
  returning id
), prod as (
  insert into products (pharmacy_id, supplier_id, name, stock, sell_price, cost_price)
  select '<pharmacy-id>', sup.id, 'Trigger Test Product', 25, 120, 80
  from sup
  returning id, supplier_id
)
select * from prod;

-- Credit sale populates last_purchase + client ledger
select create_sale_with_items(
  p_pharmacy_id => '<pharmacy-id>',
  p_items => format('[{"product_id":"%s","quantity":2}]', (select id from prod))::jsonb,
  p_client_id => (select id from cli),
  p_payment_type => 'credit'
);

select last_purchase from products where id = (select id from prod); -- expect non-null timestamp
select balance from clients where id = (select id from cli); -- equals sale total
select amount, event_type from client_balance_events where reference_table = 'sales' order by created_at desc limit 1;

-- Manual stock bump logs a stock_movement and updates last_delivery
update products
set stock = stock + 10
where id = (select id from prod);

select last_delivery from products where id = (select id from prod); -- equals timestamp from previous UPDATE
select movement_type, quantity
from stock_movements
where product_id = (select id from prod)
order by created_at desc
limit 1; -- should be 'adjustment' with +10 quantity

-- Supplier ledger recalculation
insert into supplier_balance_events (
  pharmacy_id,
  supplier_id,
  amount,
  event_type,
  reference_table
) values (
  '<pharmacy-id>',
  (select supplier_id from prod),
  500,
  'purchase',
  'manual_test'
);

select balance from suppliers where id = (select supplier_id from prod); -- expect 500

rollback;
```

Adjust the placeholders for your pharmacy and Clerk ids. If any query fails, inspect the corresponding trigger or policy noted in `supabase/migrations/0004_automated_history.sql`.
