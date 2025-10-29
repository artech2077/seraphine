# API Specification

Convex exposes typed mutations and queries grouped by domain. Next.js server actions import the generated client from `@seraphine/convex/_generated/api`.

| Function                 | Type      | Auth Scope         | Description                                                             | Inputs                                                                                 | Returns                          |
|--------------------------|-----------|--------------------|-------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|----------------------------------|
| `sales.createSale`       | mutation  | pilotTester, owner | Records barcode sale with tender details, triggers dashboard refresh    | `items[]`, `tender`, `feedbackOptIn`                                                   | `SaleEvent`                      |
| `sales.flagVariance`     | mutation  | owner              | Marks sale as variance for reconciliation                               | `saleId`, `reason`                                                                      | `SaleEvent`                      |
| `sales.listByDateRange`  | query     | pilotTester, owner | Fetches paginated sales log for POS and reconciliation screens          | `start`, `end`, optional `operatorId`, optional `tenderMethod`                          | `{ sales: SaleEvent[], next? }`  |
| `products.createOrUpdate`| mutation  | owner              | Upserts product catalog entries; enforces unique barcode                | `product` payload                                                                      | `Product`                        |
| `products.lookupByBarcode`| query    | pilotTester, owner | Retrieves product data during scanning                                  | `barcode`                                                                              | `Product | null`                 |
| `insights.listLatest`    | query     | pilotTester, owner | Returns most recent AI insights grouped by category                     | none                                                                                    | `AIInsight[]`                    |
| `insights.listHistory`   | query     | owner              | Provides historical insight records for auditing                        | `limit`, optional `category`                                                            | `{ insights: AIInsight[] }`      |
| `feedback.submit`        | mutation  | pilotTester, owner | Captures contextual pilot feedback                                      | `scope`, `sentiment`, `message`, optional `relatedSaleId`                               | `FeedbackSubmission`             |
| `feedback.list`          | query     | owner              | Aggregates submissions with filters for analytics                       | optional `scope`, optional `sentiment`, optional `cursor`                               | `{ feedback: FeedbackSubmission[] }` |
| `reports.generateDaily`  | mutation  | owner              | Streams CSV/PDF via server action using Convex data                     | `date`, `format`                                                                        | Stream (handled by Next.js)      |

Example mutation (Convex):

```typescript
export const createSale = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        unitPriceCents: v.number(),
        barcode: v.string(),
        name: v.string(),
      })
    ),
    tender: v.object({
      method: v.union(v.literal("cash"), v.literal("card"), v.literal("other")),
      amountCents: v.number(),
      notes: v.optional(v.string()),
    }),
    feedbackOptIn: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["pilotTester", "owner"]);
    const sale = SaleEventSchema.parse({
      operatorId: user.id,
      occurredAt: new Date().toISOString(),
      feedbackPrompted: args.feedbackOptIn,
      ...args,
    });
    const saleId = await ctx.db.insert("sales", sale);
    return { id: saleId };
  },
});
```
