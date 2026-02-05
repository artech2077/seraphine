import { vi } from "vitest"

import { createLowStockDraft, lowStockSummary, syncLowStockDraft } from "@/convex/alerts"
import { getHandler, type ConvexHandler } from "@/convex/__tests__/test_utils"

describe("convex/alerts", () => {
  it("returns low stock summary for active draft", async () => {
    const ctx = buildSummaryContext()

    const handler = getHandler(lowStockSummary) as ConvexHandler<
      { clerkOrgId: string },
      { count: number; signature: string; hasActiveDraft: boolean } | null
    >

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toEqual(
      expect.objectContaining({
        count: 1,
        signature: "product-1",
        hasActiveDraft: true,
      })
    )
  })

  it("creates a draft purchase order for low stock products", async () => {
    const ctx = buildCreateContext()

    const handler = getHandler(createLowStockDraft) as ConvexHandler<
      { clerkOrgId: string; supplierId: string },
      string
    >

    const orderId = await handler(ctx, { clerkOrgId: "org-1", supplierId: "supplier-1" })

    expect(orderId).toBe("order-2")
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "procurementOrders",
      expect.objectContaining({
        orderNumber: "BC-02",
        status: "DRAFT",
        createdFromAlert: true,
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "procurementItems",
      expect.objectContaining({
        orderId: "order-2",
        productId: "product-1",
        quantity: 0,
        unitPrice: 12,
      })
    )
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "pharmacy-1",
      expect.objectContaining({
        lowStockAlertOrderId: "order-2",
        lowStockAlertSignature: "product-1",
      })
    )
  })

  it("syncs draft items and preserves quantities", async () => {
    const ctx = buildSyncContext()

    const handler = getHandler(syncLowStockDraft) as ConvexHandler<
      { clerkOrgId: string; orderId: string },
      string | null
    >

    const result = await handler(ctx, { clerkOrgId: "org-1", orderId: "order-1" })

    expect(result).toBe("order-1")
    expect(ctx.db.delete).toHaveBeenCalledWith("item-1")
    expect(ctx.db.delete).toHaveBeenCalledWith("item-2")
    expect(ctx.db.delete).toHaveBeenCalledWith("item-3")
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "procurementItems",
      expect.objectContaining({
        orderId: "order-1",
        productId: "product-1",
        quantity: 5,
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "procurementItems",
      expect.objectContaining({
        orderId: "order-1",
        productId: "product-2",
        quantity: 0,
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "procurementItems",
      expect.objectContaining({
        orderId: "order-1",
        productId: "product-3",
        quantity: 2,
      })
    )
  })
})

function buildSummaryContext() {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
    lowStockAlertOrderId: "order-1",
    lowStockAlertSignature: "product-1",
  }
  const order = {
    _id: "order-1",
    pharmacyId: "pharmacy-1",
    status: "DRAFT",
    type: "PURCHASE_ORDER",
  }
  const products = [
    {
      _id: "product-1",
      pharmacyId: "pharmacy-1",
      stockQuantity: 1,
      lowStockThreshold: 2,
    },
    {
      _id: "product-2",
      pharmacyId: "pharmacy-1",
      stockQuantity: 5,
      lowStockThreshold: 2,
    },
  ]

  const db = {
    query: vi.fn((table: string) => {
      if (table === "pharmacies") {
        return {
          withIndex: () => ({
            unique: async () => pharmacy,
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
      return {
        withIndex: () => ({
          collect: async () => [],
        }),
      }
    }),
    get: vi.fn(async (id: string) => (id === "order-1" ? order : null)),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1" }),
    },
    db,
  }
}

function buildCreateContext() {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }
  const supplier = {
    _id: "supplier-1",
    pharmacyId: "pharmacy-1",
  }
  const existingOrder = {
    _id: "order-1",
    pharmacyId: "pharmacy-1",
    orderNumber: "BC-01",
    orderSequence: 1,
  }
  const products = [
    {
      _id: "product-1",
      pharmacyId: "pharmacy-1",
      stockQuantity: 1,
      lowStockThreshold: 2,
      purchasePrice: 12,
    },
  ]

  const db = {
    query: vi.fn((table: string) => {
      if (table === "pharmacies") {
        return {
          withIndex: () => ({
            unique: async () => pharmacy,
          }),
        }
      }
      if (table === "procurementOrders") {
        return {
          withIndex: () => ({
            collect: async () => [existingOrder],
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
      return {
        withIndex: () => ({
          collect: async () => [],
        }),
      }
    }),
    get: vi.fn(async (id: string) => (id === "supplier-1" ? supplier : null)),
    insert: vi.fn(async (table: string) => (table === "procurementOrders" ? "order-2" : "item-1")),
    patch: vi.fn(async () => {}),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1" }),
    },
    db,
  }
}

function buildSyncContext() {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
    lowStockAlertOrderId: "order-1",
    lowStockAlertSignature: "product-1",
  }
  const order = {
    _id: "order-1",
    pharmacyId: "pharmacy-1",
    status: "DRAFT",
    type: "PURCHASE_ORDER",
  }
  const products = [
    {
      _id: "product-1",
      pharmacyId: "pharmacy-1",
      stockQuantity: 1,
      lowStockThreshold: 2,
      purchasePrice: 10,
    },
    {
      _id: "product-2",
      pharmacyId: "pharmacy-1",
      stockQuantity: 2,
      lowStockThreshold: 2,
      purchasePrice: 15,
    },
    {
      _id: "product-3",
      pharmacyId: "pharmacy-1",
      stockQuantity: 10,
      lowStockThreshold: 2,
      purchasePrice: 20,
    },
  ]
  const items = [
    {
      _id: "item-1",
      orderId: "order-1",
      productId: "product-1",
      quantity: 5,
      unitPrice: 10,
    },
    {
      _id: "item-2",
      orderId: "order-1",
      productId: "product-3",
      quantity: 2,
      unitPrice: 20,
    },
    {
      _id: "item-3",
      orderId: "order-1",
      productId: "product-4",
      quantity: 0,
      unitPrice: 8,
    },
  ]

  const db = {
    query: vi.fn((table: string) => {
      if (table === "pharmacies") {
        return {
          withIndex: () => ({
            unique: async () => pharmacy,
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
      if (table === "procurementItems") {
        return {
          withIndex: () => ({
            collect: async () => items,
          }),
        }
      }
      return {
        withIndex: () => ({
          collect: async () => [],
        }),
      }
    }),
    get: vi.fn(async (id: string) => (id === "order-1" ? order : null)),
    patch: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    insert: vi.fn(async () => "new-item"),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1" }),
    },
    db,
  }
}
