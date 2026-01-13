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
* **Convex** (serverless database, auth-aware functions, realtime)  
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
* **Security:** Convex authorization in server functions ensures isolation per Pharmacy ID.

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
* **Database:** Convex.

## **4.2 Convex Data Model (Collections)**

The data model below mirrors the PRD fields using Convex collections and TypeScript-friendly shapes.

### **Products**

```txt
products {
  _id: Id<"products">
  pharmacyId: Id<"pharmacies">
  name: string
  barcode: string // "Code barre"
  category: string
  purchasePrice: number
  sellingPrice: number
  vatRate: number // "TVA"
  stockQuantity: number
  lowStockThreshold: number // "Seuil d'alerte"
  dosageForm: string // "Forme galenique"
  internalNotes?: string
  createdAt: number
}
```

### **Sales (Parent)**

```txt
sales {
  _id: Id<"sales">
  pharmacyId: Id<"pharmacies">
  clientId?: Id<"clients">
  sellerId: Id<"users">
  saleDate: number
  paymentMethod: "CASH" | "CARD" | "CHECK" | "CREDIT"
  globalDiscountType?: "PERCENT" | "AMOUNT"
  globalDiscountValue?: number
  totalAmountHt: number
  totalAmountTtc: number // "Total a encaisser"
  deliveryNoteText?: string
  createdAt: number
}
```

### **Sale Items (Children)**

```txt
saleItems {
  _id: Id<"saleItems">
  saleId: Id<"sales">
  productId: Id<"products">
  productNameSnapshot: string // Store name in case product is deleted
  quantity: number
  unitPriceHt: number
  vatRate: number
  lineDiscountType?: "PERCENT" | "AMOUNT"
  lineDiscountValue?: number
  totalLineTtc: number
}
```

### **Suppliers**

```txt
suppliers {
  _id: Id<"suppliers">
  pharmacyId: Id<"pharmacies">
  name: string
  email?: string
  phone?: string
  city?: string
  balance: number // Negative = debt, positive = credit
  internalNotes?: string
  createdAt: number
}
```

### **Clients**

```txt
clients {
  _id: Id<"clients">
  pharmacyId: Id<"pharmacies">
  name: string
  phone?: string
  city?: string
  creditLimit: number // "Plafond"
  outstandingBalance: number // "Encours"
  accountStatus: "OK" | "SURVEILLE" | "BLOQUE"
  lastPurchaseDate?: number
  internalNotes?: string
  createdAt: number
}
```

### **Procurement Orders (Purchase & Delivery)**

```txt
procurementOrders {
  _id: Id<"procurementOrders">
  pharmacyId: Id<"pharmacies">
  type: "PURCHASE_ORDER" | "DELIVERY_NOTE"
  supplierId: Id<"suppliers">
  status: "DRAFT" | "ORDERED" | "DELIVERED"
  externalReference?: string // For delivery note
  channel?: "EMAIL" | "PHONE"
  orderDate: number
  totalAmount: number
  createdAt: number
}
```

### **Procurement Items**

```txt
procurementItems {
  _id: Id<"procurementItems">
  orderId: Id<"procurementOrders">
  productId: Id<"products">
  quantity: number
  unitPrice: number
  lineTotal: number
}
```

# ---

**5\. Implementation Notes for Developer**

1. **Sidebar Logic:** Implement the Sidebar as a Layout component in Next.js. Use a Context or Zustand store to handle the Collapsed/Expanded state so it persists across page navigations.  
2. **POS State:** The POS requires a robust local state (array of objects) to handle adding/removing rows and recalculating totals in real-time before hitting the database.  
3. **Calculations:** Ensure all monetary calculations (VAT, Discounts) happen on the backend (via Convex mutations/actions) to prevent client-side float errors, even if they are displayed immediately on the frontend for UX.  
4. **Debts:** When a Sale is made with "Credit" as payment, trigger a Convex mutation to update the clients.outstanding\_balance and check against credit\_limit.
