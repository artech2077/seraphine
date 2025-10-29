# Database Schema

Convex uses schemaless documents with defined structure enforced in `schema.ts`.

## Sales Collection (`sales`)

```json
{
  "_id": "sales/123",
  "operatorId": "user_abc",
  "occurredAt": "2025-10-28T10:42:13.000Z",
  "items": [
    {
      "productId": "products/789",
      "barcode": "735009513016",
      "name": "Seraphine Cough Syrup",
      "quantity": 1,
      "unitPriceCents": 1299
    }
  ],
  "tender": {
    "method": "cash",
    "amountCents": 1299,
    "notes": "Exact change"
  },
  "varianceFlag": false,
  "feedbackPrompted": true,
  "createdAt": "2025-10-28T10:42:13.100Z"
}
```

Indexes: `occurredAt`, `operatorId+occurredAt`, `varianceFlag`. Daily aggregates cached in `sales_daily_totals`.

## Products Collection (`products`)

```json
{
  "_id": "products/789",
  "barcode": "735009513016",
  "name": "Seraphine Cough Syrup",
  "priceCents": 1299,
  "taxCode": "OTC",
  "notes": "Pilot batch",
  "updatedBy": "user_owner1",
  "updatedAt": "2025-10-25T16:22:00.000Z"
}
```

Indexes: `barcode` (unique), `name` (search index). Convex mutations enforce uniqueness.

## AI Insights Collection (`insights`)

```json
{
  "_id": "insights/456",
  "category": "cashVariance",
  "title": "Cash variance +MAD 420",
  "details": "Variance driven by late card settlement.",
  "generatedAt": "2025-10-28T05:00:00.000Z",
  "sourceRunId": "n8n-run-8472",
  "confidence": 0.82,
  "relatedSales": ["sales/123", "sales/124"]
}
```

Indexes: `category+generatedAt`, `sourceRunId` (unique). Only n8n service key may write.

## Feedback Collection (`feedback`)

```json
{
  "_id": "feedback/321",
  "submittedBy": "user_operator1",
  "scope": "pos",
  "sentiment": "negative",
  "message": "Scanner dropped connection twice.",
  "createdAt": "2025-10-28T12:12:00.000Z",
  "relatedSaleId": "sales/125"
}
```

Indexes: `scope+createdAt`, `submittedBy+createdAt`, `sentiment+createdAt`.

## User Profiles (`user_profiles`)

```json
{
  "_id": "user_profiles/user_abc",
  "_creationTime": 1729800000000,
  "role": "pilotTester",
  "displayName": "Amine Rahmani",
  "email": "amine@seraphine.local",
  "lastActiveAt": "2025-10-28T10:45:00.000Z"
}
```

Populated via Clerk webhook; provides quick role lookup inside Convex.
