# Data Models

## User

**Purpose:** Represents authenticated operators and owners using Clerk to drive permissions and auditing.

**Key Attributes:**
- `id`: string (Clerk user ID) – unique identity reference returned by Clerk.
- `role`: `"owner" | "pilotTester"` – governs access to dashboard, settings, and POS features.
- `email`: string – primary email for notifications and login audit.
- `displayName`: string – used in dashboards, logs, and report exports.

```typescript
export interface User {
  id: string; // Clerk user ID
  role: "owner" | "pilotTester";
  email: string;
  displayName: string;
  activeSince: string; // ISO timestamp to support retention analysis
}
```

## Product

**Purpose:** Catalog entry that powers barcode lookup, pricing, and AI insight categorization.

**Key Attributes:**
- `id`: Id<"products"> – Convex document identifier.
- `barcode`: string – unique scanner code; duplicates rejected.
- `name`: string – display name for POS and reports.
- `priceCents`: number – stored in smallest currency unit for accuracy.
- `taxCode`: string – allows future tax calculation logic.

```typescript
export interface Product {
  id: Id<"products">;
  barcode: string;
  name: string;
  priceCents: number;
  taxCode: string;
  notes?: string;
  updatedBy: string; // Clerk user who last edited
  updatedAt: string; // ISO timestamp
}
```

## SaleEvent

**Purpose:** Canonical record of a barcode transaction including tender details and audit info.

**Key Attributes:**
- `id`: Id<"sales"> – Convex identifier.
- `items`: array of product snapshots (productId, quantity, unitPriceCents, barcode, name).
- `tender`: method/amount/notes.
- `operatorId`: string – Clerk user executing the sale.
- `occurredAt`: string – ISO timestamp for reconciliation.
- `varianceFlag`: boolean – signals anomalies surfaced later.

```typescript
export interface SaleEvent {
  id: Id<"sales">;
  items: Array<{
    productId: Id<"products">;
    barcode: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  tender: {
    method: "cash" | "card" | "other";
    amountCents: number;
    notes?: string;
  };
  operatorId: string;
  occurredAt: string;
  varianceFlag?: boolean;
  feedbackPrompted: boolean;
}
```

## AIInsight

**Purpose:** Read-only records written by n8n to surface cash variance, top sellers, and alerts.

**Key Attributes:**
- `id`: Id<"insights"> – Convex identifier.
- `category`: `"cashVariance" | "topSeller" | "watchlist"` – supports UI grouping.
- `title`: string – summary for dashboard cards.
- `details`: string – explanation.
- `generatedAt`: string – timestamp of n8n workflow run.
- `sourceRunId`: string – n8n execution reference.

```typescript
export interface AIInsight {
  id: Id<"insights">;
  category: "cashVariance" | "topSeller" | "watchlist";
  title: string;
  details: string;
  generatedAt: string;
  sourceRunId: string;
  relatedSales?: Array<Id<"sales">>;
  confidence?: number;
}
```

## FeedbackSubmission

**Purpose:** Captures qualitative pilot feedback tagged to a screen or workflow.

**Key Attributes:**
- `id`: Id<"feedback"> – Convex identifier.
- `submittedBy`: string – Clerk user reference.
- `scope`: `"dashboard" | "pos" | "salesLog" | "settings"` – origin of feedback.
- `sentiment`: `"positive" | "neutral" | "negative"` – quick triage.
- `message`: string – free-text comment.
- `createdAt`: string – timestamp stored for analytics.

```typescript
export interface FeedbackSubmission {
  id: Id<"feedback">;
  submittedBy: string;
  scope: "dashboard" | "pos" | "salesLog" | "settings";
  sentiment: "positive" | "neutral" | "negative";
  message: string;
  createdAt: string;
  relatedSaleId?: Id<"sales">;
  screenshotUrl?: string;
}
```
