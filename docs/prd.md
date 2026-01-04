# **Seraphine – MVP Product Requirements Document (PRD)**

Date: January 2026  
Prepared for: Engineering & AI Development (Codex)  
Version: 2.0 (Updated with Module Specifications)

# ---

**1\. Overview**

## **1.1 Product Summary**

Seraphine is a modern SaaS web application designed for independent pharmacies in Morocco. It centralizes pharmacy operations—sales, inventory, client credit, supplier relations, cash reconciliation, and procurement—into a unified, French-localized dashboard.

The platform is built using:

* **Next.js 14** (App Router)  
* **TailwindCSS \+ Shadcn UI**  
* **Supabase** (PostgreSQL, RLS, RPC, Realtime)  
* **Clerk Authentication & Organizations**  
* **Vercel Deployment**

## **1.2 Vision**

To become the simplest and most intelligent operating system for Moroccan pharmacies, replacing manual Excel sheets and fragmented tools with a reliable, automated system.

## **1.3 Success Metrics**

| Metric | Target |
| :---- | :---- |
| Daily cash reconciliation time | \< 15 minutes |
| Inventory accuracy | \> 95% |
| Forecast variance | \< 15% |
| Weekly active usage | ≥ 90% |

# ---

**2\. User Experience & Navigation Structure \[New\]**

## **2.1 Global Layout (Sidebar)**

The application uses a fixed **Left Sidebar** layout (250px-280px width) with a high Z-index, containing three distinct zones:

* **Zone 1: Header (Brand):** Contains the Logo. Clicking acts as a "Home" button returning to the Dashboard.  
* **Zone 2: Main Navigation:**  
  * **Tableau de bord** (Dashboard)  
  * **Ventes** (Sales)  
  * **Inventaire** (Inventory)  
  * **Achats** (Purchases)  
  * **Fournisseurs** (Suppliers)  
  * **Clients** (Customers)  
  * **Réconciliation caisse** (Cash Reconciliation)  
  * **Rapports** (Reports)  
  * **Analytique** (Analytics)  
  * *Interaction:* Active state must be visually distinct (bold/accent border).  
* **Zone 3: Utility/Footer:**  
  * **Paramètres** (Settings)  
  * **Assistance** (Support)  
  * **Recherche** (Global Search Modal for products/clients/invoices)  
* **Collapsed State:**  
  * Sidebar can toggle to a "Mini Sidebar" (60px-80px).  
  * Text labels hide; Icons center-align.  
  * Hovering icons displays a tooltip with the section name.  
  * Mobile: Hidden by default, toggled via Hamburger menu.

# ---

**3\. MVP Scope & Functional Specifications**

## **3.1 Authentication & User Management**

* **Provider:** Clerk Auth (Organizations).  
* **Roles:** Owner (Full Admin), Pharmacist/Staff (POS & Inventory only), Restricted (View only).  
* **Security:** RLS isolation per Pharmacy ID.

## **3.2 Sales Management (Module: Ventes)**

This module operates via two tabs: **Point de vente (POS)** and **Historique des ventes**.

### **3.2.1 Point of Sale (POS) Interface**

* **Transaction List:**  
  * **Product Input:** Search by name or scan barcode. Auto-fills Unit Price (HT) and VAT.  
  * **Calculation:** Total Line \= (Price \* Qty) \- Line Discount.  
  * **Discounts:** Supports **Line-level discounts** (specific to one item) AND **Global discounts** (applied to total).  
  * **Tax:** Auto-calculates P.U TTC (Incl. Tax) based on stored VAT rates.  
* **Checkout:**  
  * **Client Selection:** Optional. Links sale to Client History.  
  * **Payment Methods:** Cash, Card, Check, Credit.  
  * **Action:** "Enregistrer la vente" validates inputs, creates Sale ID, updates stock, and clears form.

### **3.2.2 Sales History**

* **View:** Datatable with sortable columns (Date, Client, Seller, Amount).  
* **Hierarchical Data:** Rows are expandable (Chevron icon). Expanding a row reveals the **Nested Detail Table** (Child Rows) showing specific items sold in that transaction.  
* **Actions:** Edit sale, Delete sale (reverts stock), Download Invoice (PDF).

## **3.3 Inventory Management (Module: Inventaire)**

### **3.3.1 Dashboard**

* **Filters:** Product Name, Barcode, Stock Level (Low/Out), VAT Rate, Category.  
* **Columns:** Stock, Threshold, Buy Price, Sell Price, VAT, Category, Forme Galénique.  
* **Actions:** Edit (Modal), Delete (Confirmation), Print/Export list.

### **3.3.2 Product CRUD (Modals)**

* **Add/Edit Modal:**  
  * **Core Fields:** Name, Barcode (EAN/GTIN), Category (e.g., Antalgique).  
  * **Financials:** Purchase Price, Selling Price, VAT Rate.  
  * **Stock Control:** Initial Stock, **Seuil d’alerte** (Low stock threshold).  
  * **Details:** **Forme galénique** (Dosage form e.g., Tablet), Internal Notes.

## **3.4 Procurement (Module: Achats)**

Split into two distinct workflows via Tabs:

### **3.4.1 Purchase Orders (Bons de commande)**

* **Workflow:** Create Draft \-\> Send to Supplier \-\> Mark as Ordered.  
* **Fields:** Supplier, Channel (Email/Phone), Date, Items Array.  
* **Status Colors:** Yellow (Draft), Blue (Ordered), Green (Delivered).

### **3.4.2 Delivery Notes (Bons de livraison)**

* **Workflow:** Receive goods \-\> Create Delivery Note \-\> **Update Inventory Stock**.  
* **Key Field:** Ref livraison (External reference from supplier paper slip).  
* **Data Structure:** Header (Supplier/Date) \+ Dynamic Articles List (Product, Qty, Unit Price).

## **3.5 Supplier Management (Module: Fournisseurs)**

* **Dashboard:** List view filtering by Name, City, or **Balance**.  
* **Financial Logic:**  
  * **Balance Display:** Negative balances (Debt) in **Red**. Positive balances (Credit) in **Green**.  
* **Data Fields:** Name, Email, Phone, City, Balance, Internal Notes (logistics/terms).

## **3.6 Client Credit Management (Module: Clients / Suivi des encours)**

Functions as a CRM for customers with payment facilities.

* **Dashboard:** Tracks "Encours" (Outstanding Debt) vs "Plafond" (Credit Limit).  
* **Status Logic:**  
  * **OK (Green):** Within limits.  
  * **Surveillé (Yellow):** Near limit/requires monitoring.  
  * **Bloqué (Red):** Exceeded limit/stop sales.  
* **Fields:** Client Name, Phone, Plafond, Encours, Last Purchase Date.

## **3.7 Cash Reconciliation (Module: Réconciliation)**

* **Process:**  
  1. System calculates Expected Cash based on POS sales (Cash method).  
  2. User inputs Actual Cash (counted from drawer).  
  3. System records Discrepancy and locks the day.

# ---

**4\. Technical Specifications & Data Model**

## **4.1 Architecture**

* **Frontend:** Next.js 14 (App Router).  
* **State Management:** React Query (Server state) \+ Zustand (Client state for POS cart).  
* **Database:** Supabase (PostgreSQL).

## **4.2 Updated Database Schema (Key Tables)**

The schema has been expanded to support the specific fields requested in the modules.

### **Products**

SQL

products (  
  id uuid primary key,  
  pharmacy\_id uuid,  
  name text,  
  barcode text, \-- "Code barre"  
  category text,  
  purchase\_price numeric,  
  selling\_price numeric,  
  vat\_rate numeric, \-- "TVA"  
  stock\_quantity integer,  
  low\_stock\_threshold integer, \-- "Seuil d'alerte"  
  dosage\_form text, \-- "Forme galénique"  
  internal\_notes text,  
  created\_at timestamptz  
)

### **Sales (Parent)**

SQL

sales (  
  id uuid primary key, \-- "saleId"  
  pharmacy\_id uuid,  
  client\_id uuid references clients(id),  
  seller\_id uuid references users(id),  
  sale\_date timestamptz,  
  payment\_method text, \-- Cash, Card, Check  
  global\_discount\_type text, \-- Percent or Amount  
  global\_discount\_value numeric,  
  total\_amount\_ht numeric,  
  total\_amount\_ttc numeric, \-- "Total à encaisser"  
  delivery\_note\_text text,  
  created\_at timestamptz  
)

### **Sale Items (Children)**

SQL

sale\_items (  
  id uuid primary key,  
  sale\_id uuid references sales(id),  
  product\_id uuid references products(id),  
  product\_name\_snapshot text, \-- Store name in case product is deleted  
  quantity integer,  
  unit\_price\_ht numeric,  
  vat\_rate numeric,  
  line\_discount\_type text,  
  line\_discount\_value numeric,  
  total\_line\_ttc numeric  
)

### **Suppliers**

SQL

suppliers (  
  id uuid primary key,  
  pharmacy\_id uuid,  
  name text,  
  email text,  
  phone text,  
  city text,  
  balance numeric default 0, \-- Negative \= Debt, Positive \= Credit  
  internal\_notes text,  
  created\_at timestamptz  
)

### **Clients**

SQL

clients (  
  id uuid primary key,  
  pharmacy\_id uuid,  
  name text,  
  phone text,  
  city text,  
  credit\_limit numeric, \-- "Plafond"  
  outstanding\_balance numeric default 0, \-- "Encours"  
  account\_status text default 'OK', \-- 'OK', 'SURVEILLE', 'BLOQUE'  
  last\_purchase\_date date,  
  internal\_notes text,  
  created\_at timestamptz  
)

### **Procurement Orders (Purchase & Delivery)**

SQL

procurement\_orders (  
  id uuid primary key,  
  pharmacy\_id uuid,  
  type text, \-- 'PURCHASE\_ORDER' or 'DELIVERY\_NOTE'  
  supplier\_id uuid references suppliers(id),  
  status text, \-- 'DRAFT', 'ORDERED', 'DELIVERED'  
  external\_reference text, \-- For Delivery Note  
  channel text, \-- Email, Phone  
  order\_date date,  
  total\_amount numeric,  
  created\_at timestamptz  
)

### **Procurement Items**

SQL

procurement\_items (  
  id uuid primary key,  
  order\_id uuid references procurement\_orders(id),  
  product\_id uuid references products(id),  
  quantity integer,  
  unit\_price numeric,  
  line\_total numeric  
)

# ---

**5\. Implementation Notes for Developer**

1. **Sidebar Logic:** Implement the Sidebar as a Layout component in Next.js. Use a Context or Zustand store to handle the Collapsed/Expanded state so it persists across page navigations.  
2. **POS State:** The POS requires a robust local state (array of objects) to handle adding/removing rows and recalculating totals in real-time before hitting the database.  
3. **Calculations:** Ensure all monetary calculations (VAT, Discounts) happen on the backend (via Supabase RPC) to prevent client-side float errors, even if they are displayed immediately on the frontend for UX.  
4. **Debts:** When a Sale is made with "Credit" as payment, trigger a database function to update the clients.outstanding\_balance and check against credit\_limit.

