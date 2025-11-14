# Seraphine – MVP Product Requirements Document (PRD)
**Date:** November 2025  
**Prepared for:** Engineering & AI Development (Codex)  
**Version:** 1.0  

---

# 1. Overview

## 1.1 Product Summary
Seraphine is a modern SaaS web application designed for independent pharmacies in Morocco. It centralizes pharmacy operations—sales, inventory, clients, suppliers, cash reconciliation, procurement, batch preparations, and financial reporting—into a unified, French-localized dashboard.

The platform is built using:
- **Next.js 14**
- **TailwindCSS + Shadcn UI**
- **Supabase** (PostgreSQL, RLS, RPC, Realtime)
- **Clerk Authentication & Organizations**
- **Vercel Deployment**

Seraphine replaces Excel and fragmented tools with a reliable, automated system.

---

## 1.2 Vision
To become the simplest and most intelligent operating system for Moroccan pharmacies.

## 1.3 Objectives
- Centralize operations
- Automate cash reconciliation
- Provide forecasting
- Deliver French-localized UX
- Enforce secure multi-role access

## 1.4 Success Metrics
| Metric | Target |
|--------|---------|
| Daily cash reconciliation time | < 15 minutes |
| Inventory accuracy | > 95% |
| Forecast variance | < 15% |
| Cash discrepancies | < 5% |
| Weekly active usage | ≥ 90% |
| NPS | > 50 |

---

# 2. User Personas

## 2.1 Pharmacy Owner
Needs accurate reconciliation, stock visibility, reporting.

## 2.2 Pharmacy Staff
Needs fast checkout, barcode scanning, simple workflows.

---

# 3. Problem Statement
Pharmacies struggle with manual processes, reconciliation errors, outdated tools.

---

# 4. MVP Scope & Features

## 4.1 Authentication & User Management
- Clerk auth
- Clerk Organizations
- Supabase user profiles
- Roles: owner, staff, restricted
- RLS isolation

## 4.2 Dashboard
Shows sales, alerts, forecast, quick actions.

## 4.3 Sales Management
- Multiple line items
- Barcode support
- Payment types
- Auto stock decrement

### Discounts
- Percentage or amount
- Line or sale level
- Affects totals & reports

### RPC
`create_sale_with_items` handles totals, discounts, stock movements.

---

## 4.4 Cash Reconciliation
### Opening Cash
Stored as `opening_cash`.

### Closing Cash
System computes expected cash.
User enters actual cash. Discrepancy stored.

---

## 4.5 Inventory Management
Products, stock, alerts, CSV import, movements.

## 4.6 Supplier Management
Balances, invoices, purchase orders, delivery notes.

## 4.7 Client Management
Credit limits, balances, payments.

## 4.8 Procurement Workflow
- Purchase Orders
- Delivery Notes

## 4.9 Pharmaceutical Preparations
Batch production with ingredient deduction.

## 4.10 Data Import
Products, suppliers, clients, historical sales.

## 4.11 Forecasting
Moving average stored in `forecasts`.

## 4.12 Reporting
P&L, accounting exports, inventory valuation.

## 4.13 Guided Onboarding
3 steps: pharmacy, products, suppliers.

## 4.14 Monitoring & Deployment
Sentry, Supabase logs, Vercel.

---

# 5. User Flows
Sales, reconciliation, procurement, import, onboarding.

---

# 6. Technical Specifications
Architecture: Next.js, Supabase, Clerk.
RLS, triggers, RPC, realtime.

---

# 7. Supabase Schema (Core Tables)
### Users
```sql
users (
  id uuid primary key,
  clerk_id text unique,
  pharmacy_id uuid,
  role text,
  name text,
  email text,
  created_at timestamptz default now()
)
```

### Pharmacies
```sql
pharmacies (
  id uuid primary key,
  name text,
  address text,
  currency text default 'MAD',
  created_at timestamptz default now()
)
```

### Products
```sql
products (
  id uuid primary key,
  pharmacy_id uuid,
  name text,
  sku text,
  supplier_id uuid,
  cost_price numeric,
  sell_price numeric,
  stock integer,
  category text,
  low_stock_threshold integer,
  created_at timestamptz default now()
)
```

### Sales
```sql
sales (
  id uuid primary key,
  pharmacy_id uuid,
  client_id uuid,
  payment_type text,
  subtotal numeric,
  discount_percent numeric,
  discount_amount numeric,
  total_after_discount numeric,
  sale_date date,
  created_at timestamptz default now()
)
```

### Cash Reconciliations
```sql
cash_reconciliations (
  id uuid primary key,
  pharmacy_id uuid,
  date date,
  opening_cash numeric,
  system_cash_expected numeric,
  actual_cash numeric,
  discrepancy numeric,
  notes text,
  closed_by uuid,
  created_at timestamptz default now()
)
```
End of Seraphine MVP PRD