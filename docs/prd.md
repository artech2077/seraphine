# Seraphine – MVP Product Requirements Document (PRD)

**Date:** November 2025  
**Prepared for:** Engineering & AI Development (Codex)  
**Version:** 1.1  

---

## 1. Overview

### Product Summary
**Seraphine** is a unified SaaS web application for independent pharmacy owners in Morocco. It replaces fragmented systems with one intelligent dashboard that automates cash reconciliation, tracks multi-supplier inventory, provides real-time profit visibility, and uses AI-powered forecasting to optimize restocking decisions.

### Vision
To empower Moroccan pharmacists with a simple, intelligent, and fully localized platform that automates their daily operations — freeing time for patient care and business growth.

### Objectives
- Replace spreadsheets and disconnected POS tools with a single unified system.  
- Reduce daily reconciliation time by >80%.  
- Enable real-time visibility of profits and stock.  
- Build a reliable AI foundation for sales forecasting.  
- Deliver all features in French.

### Success Metrics
| Metric | Target |
|---------|---------|
| Reconciliation time | < 15 minutes |
| Forecast variance | < 15% |
| Cash accuracy | > 95% |
| Active users | > 90% weekly activity |
| NPS (User satisfaction) | > 50 |

---

## 2. User Personas & Needs

### Primary User: Independent Pharmacy Owner
**Profile:**  
35–55 years old, owns 1–2 pharmacies, moderate tech literacy, currently using Excel or fragmented POS systems.

**Pain Points:**  
- Manual reconciliation of cash and sales (2+ hours daily)  
- No real-time profit visibility  
- Errors in supplier invoices and pricing  
- Difficulty managing credit clients  

**Goals:**  
- Close daily cash fast and accurately  
- View instant profit/loss insights  
- Predict stockouts and optimize reorders  
- Export ready-to-send financial reports  

### Secondary User: Pharmacy Staff
**Pain Points:**  
- Manual, repetitive data entry  
- Confusing reconciliation procedures  

**Goals:**  
- Record sales easily and error-free  
- Follow clear cash handling workflows  

---

## 3. Problem Statement & Goals

### Problem
Pharmacists in Morocco rely on fragmented tools for sales, inventory, and accounting. This leads to hours of manual work, data inconsistencies, and profit uncertainty.

### Goals
- Centralize all operations (sales, cash, stock, suppliers).  
- Automate reconciliation and reporting.  
- Use AI forecasting to anticipate future demand.  
- Localize everything in French with intuitive UX.  

---

## 4. MVP Scope & Core Features

### MVP Features

#### 1. Unified Sales & Cash Management
- Record transactions by payment type (cash, card, credit).  
- Automatic reconciliation between system totals and actual cash.  
- Flag discrepancies for review.  
- Generate daily summary reports.

#### 2. Multi-Supplier Inventory Tracking
- Add, edit, and monitor stock by supplier.  
- Handle varying purchase costs.  
- Track deliveries, adjustments, and stock alerts.

#### 3. Client & Supplier Management
- Store profiles, balances, and payment history.  
- Track credit limits and outstanding amounts.  
- Manage supplier delivery notes and invoices.

#### 4. AI-Powered Forecasting (Simple)
- Basic trend or moving-average model predicting next-day sales.  
- Display expected sales and confidence range.  
- Trained via historical sales data stored in Supabase.

#### 5. Financial Reporting & Accounting Exports
- Profit & loss summaries by day/week/month.  
- CSV/XLS export for accounting.  
- Include key ratios: gross margin, cash balance, top SKUs.

#### 6. French Interface
- All UI elements, labels, and notifications in French.  
- Localized date/currency (MAD).

#### 7. Guided Onboarding
- 3-step wizard: Pharmacy setup → Add products → Add suppliers.  
- Tooltips and inline help to explain features.

### Out of Scope
- Native mobile apps (responsive web only).  
- Multi-location management.  
- Barcode scanning and prescription features.  
- Loyalty or insurance integration.  

---

## 5. User Flows

### 5.1 Daily Cash Reconciliation
1. Cashier records daily sales (cash, card, credit).  
2. System compares total with declared closing cash.  
3. Discrepancies highlighted (over/short).  
4. Owner approves and generates “Rapport de Caisse”.  

### 5.2 Inventory Management
1. Owner adds or imports products.  
2. Sales automatically reduce stock.  
3. Supplier purchase updates stock levels.  
4. Alerts trigger for low stock items.

### 5.3 Forecast & Reporting
1. Dashboard shows daily profit, total sales, and inventory value.  
2. AI predicts next-day sales with variance estimate.  
3. User exports report for accountant or recordkeeping.

---

## 6. Success Criteria & KPIs

| Area | KPI | Target |
|------|-----|--------|
| Efficiency | Daily close time | < 15 minutes |
| Forecasting | AI variance | < 15% |
| Accuracy | Cash/sales match | > 95% |
| Adoption | Active pharmacies | ≥ 10 |
| Reliability | Critical bug rate | 0 blocking issues |

---

## 7. Technical Considerations

**Stack:**
- **Frontend:** Next.js (TypeScript)  
- **UI:** TailwindCSS + ShadcnUI (localized French)  
- **Backend/DB:** Supabase (PostgreSQL, Realtime API)  
- **Auth:** Clerk (email/password + OTP)  
- **Hosting:** Vercel  
- **AI Forecasting:** Supabase Edge Functions (simple regression / moving average)  
- **Exports:** Supabase CSV query export  

**Simplifications:**
- Basic rule-based AI for MVP.  
- One pharmacy per account.  
- Manual data import only.  
- No offline mode initially.  

---

## 8. Supabase Schema Design (MVP)

Below is the proposed relational schema for Supabase:

### 8.1 Tables Overview
| Table | Purpose |
|--------|----------|
| users | Registered pharmacy owners and staff (Clerk-auth integrated) |
| pharmacies | Pharmacy-level settings and info |
| products | Medicines and goods with supplier links |
| suppliers | Supplier information and pricing |
| clients | Customer records and credit management |
| sales | Sales transactions per day |
| sale_items | Individual items within each sale |
| cash_reconciliations | Daily cash reconciliation logs |
| purchases | Supplier purchases and stock updates |
| inventory_movements | Tracks all stock ins/outs |
| forecasts | AI-generated sales forecasts |
| reports | Cached summaries for faster dashboard loading |

### 8.2 Table Definitions (simplified SQL)

```sql
-- USERS
users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE,
  role text CHECK (role IN ('owner', 'staff')),
  pharmacy_id uuid REFERENCES pharmacies(id),
  name text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- PHARMACIES
pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  owner_id uuid REFERENCES users(id),
  address text,
  currency text DEFAULT 'MAD',
  created_at timestamptz DEFAULT now()
);

-- SUPPLIERS
suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id),
  name text,
  contact text,
  email text,
  balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- CLIENTS
clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id),
  name text,
  phone text,
  credit_limit numeric DEFAULT 0,
  balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- PRODUCTS
products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id),
  name text,
  sku text UNIQUE,
  supplier_id uuid REFERENCES suppliers(id),
  cost_price numeric,
  sell_price numeric,
  stock integer DEFAULT 0,
  unit text,
  created_at timestamptz DEFAULT now()
);

-- SALES
sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id),
  client_id uuid REFERENCES clients(id),
  total numeric,
  payment_type text CHECK (payment_type IN ('cash', 'card', 'credit')),
  sale_date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- SALE ITEMS
sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id),
  product_id uuid REFERENCES products(id),
  quantity integer,
  unit_price numeric,
  total numeric
);

-- PURCHASES
purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id),
  pharmacy_id uuid REFERENCES pharmacies(id),
  total numeric,
  purchase_date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- INVENTORY MOVEMENTS
inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id),
  product_id uuid REFERENCES products(id),
  type text CHECK (type IN ('sale', 'purchase', 'adjustment')),
  quantity integer,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- CASH RECONCILIATIONS
cash_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id),
  date date DEFAULT current_date,
  system_total numeric,
  actual_cash numeric,
  discrepancy numeric,
  notes text,
  closed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- FORECASTS
forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id),
  forecast_date date,
  predicted_sales numeric,
  confidence numeric,
  model_version text,
  created_at timestamptz DEFAULT now()
);
```

### 8.3 Relationships
- **1:N** between `pharmacies` → `products`, `sales`, `suppliers`, `clients`  
- **1:N** between `sales` → `sale_items`  
- **1:N** between `suppliers` → `purchases`  
- **1:N** between `products` → `inventory_movements`  
- **1:1 daily** between `pharmacies` → `cash_reconciliations` (per date)

---

## 9. Constraints, Risks & Assumptions

| Type | Description | Mitigation |
|------|-------------|-------------|
| Timeline | 3-month MVP target | Prioritize 3 workflows (sales, reconciliation, inventory) |
| Data quality | Limited historical data for AI | Start simple, refine with usage |
| Adoption | Habit change from manual to digital | Guided onboarding + training |
| Compliance | Moroccan financial/export rules | CSV templates aligned with local accounting |
| Budget | Bootstrap/self-funded | Use free tiers for Supabase & Vercel |

---

## 10. Launch Success Definition

- 10 pharmacies active within pilot  
- <15 min daily closing workflow  
- <15% AI forecast variance  
- >95% cash accuracy  
- 0 blocking calculation errors  

---

**End of Document – Seraphine MVP PRD**
