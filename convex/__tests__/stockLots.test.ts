import { vi } from "vitest"

import { getLotTraceabilityReport, listByOrg, listExpiryRisk } from "@/convex/stockLots"
import { getHandler, type ConvexHandler } from "@/convex/__tests__/test_utils"

describe("convex/stockLots", () => {
  it("returns stock grouped by product and lot", async () => {
    const ctx = buildContext()
    const handler = getHandler(listByOrg) as ConvexHandler<
      { clerkOrgId: string; productId?: string },
      unknown[]
    >

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toContainEqual(
      expect.objectContaining({
        productId: "product-1",
        productName: "Produit A",
        totalQuantity: 10,
      })
    )
  })

  it("returns expiry risk with window and filter reconciliation", async () => {
    const ctx = buildContext()
    const handler = getHandler(listExpiryRisk) as ConvexHandler<
      {
        clerkOrgId: string
        windowDays?: 30 | 60 | 90
        filters?: {
          productIds?: string[]
          categories?: string[]
          supplierIds?: string[]
          severities?: Array<"EXPIRED" | "CRITICAL" | "WARNING" | "WATCH">
        }
      },
      {
        items: Array<{
          lotId: string
          lotNumber: string
          severity: string
          recommendedPathHref: string
          lotDetailPath: string
        }>
        counts: {
          total: number
          expired: number
          dueIn30Days: number
          dueIn60Days: number
          dueIn90Days: number
        }
      }
    >

    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-02-11T00:00:00Z"))

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      windowDays: 60,
      filters: {
        categories: ["Medicaments"],
        supplierIds: ["supplier-1"],
        severities: ["CRITICAL", "WARNING"],
      },
    })

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        lotNumber: "LOT-001",
        severity: "CRITICAL",
        recommendedPathHref: "/app/ventes",
      })
    )
    expect(result.items[1]).toEqual(
      expect.objectContaining({
        lotNumber: "LOT-002",
        severity: "WARNING",
        lotDetailPath: "/app/produit?productId=product-1&lotNumber=LOT-002",
      })
    )

    expect(result.counts).toEqual({
      total: 2,
      expired: 0,
      dueIn30Days: 1,
      dueIn60Days: 2,
      dueIn90Days: 2,
    })

    vi.restoreAllMocks()
  })

  it("returns lot traceability timeline with aggregate quantities", async () => {
    const ctx = buildContext()
    const handler = getHandler(getLotTraceabilityReport) as ConvexHandler<
      { clerkOrgId: string; lotNumber: string },
      {
        lotNumber: string
        items: Array<{
          lotNumber: string
          receivedQuantity: number
          soldQuantity: number
          currentBalance: number
          timeline: Array<{ eventType: string; delta: number }>
        }>
      }
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      lotNumber: "lot-001",
    })

    expect(result.lotNumber).toBe("LOT-001")
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        lotNumber: "LOT-001",
        receivedQuantity: 5,
        soldQuantity: 3,
        currentBalance: 5,
      })
    )
    expect(result.items[0].timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: "RECEPTION", delta: 5 }),
        expect.objectContaining({ eventType: "SORTIE", delta: -3 }),
      ])
    )
  })

  it("returns empty lot traceability report on unauthorized org", async () => {
    const ctx = buildContext("org-2")
    const handler = getHandler(getLotTraceabilityReport) as ConvexHandler<
      { clerkOrgId: string; lotNumber: string },
      { items: unknown[] }
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      lotNumber: "LOT-001",
    })

    expect(result.items).toEqual([])
  })
})

function buildContext(orgId = "org-1") {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }
  const products = [
    { _id: "product-1", pharmacyId: "pharmacy-1", name: "Produit A", category: "Medicaments" },
    { _id: "product-2", pharmacyId: "pharmacy-1", name: "Produit B", category: "Parapharmacie" },
  ]
  const suppliers = [
    { _id: "supplier-1", pharmacyId: "pharmacy-1", name: "Supplier One" },
    { _id: "supplier-2", pharmacyId: "pharmacy-1", name: "Supplier Two" },
  ]
  const orders = [
    { _id: "order-1", pharmacyId: "pharmacy-1", supplierId: "supplier-1", orderNumber: "BL-01" },
    { _id: "order-2", pharmacyId: "pharmacy-1", supplierId: "supplier-2" },
  ]
  const procurementItemLots = [
    {
      _id: "proc-lot-1",
      pharmacyId: "pharmacy-1",
      orderId: "order-1",
      procurementItemId: "proc-item-1",
      productId: "product-1",
      lotNumber: "LOT-001",
      expiryDate: Date.parse("2026-02-20"),
      quantity: 5,
      createdAt: 10,
    },
  ]
  const saleItemLots = [
    {
      _id: "sale-lot-1",
      pharmacyId: "pharmacy-1",
      saleId: "sale-1",
      saleItemId: "sale-item-1",
      productId: "product-1",
      lotNumber: "LOT-001",
      expiryDate: Date.parse("2026-02-20"),
      quantity: 3,
      createdAt: 20,
    },
  ]
  const stockMovements = [
    {
      _id: "movement-1",
      pharmacyId: "pharmacy-1",
      productId: "product-1",
      productNameSnapshot: "Produit A",
      delta: -3,
      movementType: "SALE_STOCK_SYNC",
      lotNumber: "LOT-001",
      lotExpiryDate: Date.parse("2026-02-20"),
      reason: "Création de vente (FEFO)",
      sourceId: "sale-1",
      createdByClerkUserId: "user-1",
      createdAt: 30,
    },
  ]
  const lots = [
    {
      _id: "lot-1",
      pharmacyId: "pharmacy-1",
      productId: "product-1",
      lotNumber: "LOT-001",
      expiryDate: Date.parse("2026-02-20"),
      quantity: 5,
      sourceType: "DELIVERY_NOTE" as const,
      sourceOrderId: "order-1",
      sourceItemId: "item-1",
      createdAt: 1,
      updatedAt: 1,
    },
    {
      _id: "lot-2",
      pharmacyId: "pharmacy-1",
      productId: "product-1",
      lotNumber: "LOT-002",
      expiryDate: Date.parse("2026-03-25"),
      quantity: 3,
      sourceType: "DELIVERY_NOTE" as const,
      sourceOrderId: "order-1",
      sourceItemId: "item-2",
      createdAt: 2,
      updatedAt: 2,
    },
    {
      _id: "lot-3",
      pharmacyId: "pharmacy-1",
      productId: "product-2",
      lotNumber: "LOT-003",
      expiryDate: Date.parse("2026-01-30"),
      quantity: 4,
      sourceType: "DELIVERY_NOTE" as const,
      sourceOrderId: "order-2",
      sourceItemId: "item-3",
      createdAt: 3,
      updatedAt: 3,
    },
    {
      _id: "lot-4",
      pharmacyId: "pharmacy-1",
      productId: "product-1",
      lotNumber: "LOT-004",
      expiryDate: Date.parse("2026-06-30"),
      quantity: 2,
      sourceType: "DELIVERY_NOTE" as const,
      sourceOrderId: "order-1",
      sourceItemId: "item-4",
      createdAt: 4,
      updatedAt: 4,
    },
    {
      _id: "lot-5",
      pharmacyId: "pharmacy-1",
      productId: "product-2",
      lotNumber: "LOT-005",
      expiryDate: Date.parse("2026-03-01"),
      quantity: 0,
      sourceType: "DELIVERY_NOTE" as const,
      sourceOrderId: "order-2",
      sourceItemId: "item-5",
      createdAt: 5,
      updatedAt: 5,
    },
  ]

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId }),
    },
    db: {
      query: vi.fn((table: string) => {
        if (table === "pharmacies") {
          return {
            withIndex: () => ({
              unique: async () => pharmacy,
            }),
          }
        }
        if (table === "stockLots") {
          return {
            withIndex: () => ({
              collect: async () => lots,
            }),
          }
        }
        if (table === "products") {
          return {
            withIndex: () => ({
              collect: async () => products,
            }),
          }
        }
        if (table === "procurementOrders") {
          return {
            withIndex: () => ({
              collect: async () => orders,
            }),
          }
        }
        if (table === "suppliers") {
          return {
            withIndex: () => ({
              collect: async () => suppliers,
            }),
          }
        }
        if (table === "procurementItemLots") {
          return {
            withIndex: () => ({
              collect: async () => procurementItemLots,
            }),
          }
        }
        if (table === "saleItemLots") {
          return {
            withIndex: () => ({
              collect: async () => saleItemLots,
            }),
          }
        }
        if (table === "stockMovements") {
          return {
            withIndex: () => ({
              collect: async () => stockMovements,
            }),
          }
        }
        return {
          withIndex: () => ({
            collect: async () => [],
            unique: async () => null,
          }),
        }
      }),
    },
  }
}
