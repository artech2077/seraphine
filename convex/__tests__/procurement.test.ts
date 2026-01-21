import { vi } from "vitest"

import { create, listByOrg, remove, update } from "@/convex/procurement"

type ConvexHandler<Args, Result = unknown> = (ctx: unknown, args: Args) => Promise<Result>

describe("convex/procurement", () => {
  it("lists procurement orders with mapped items", async () => {
    const ctx = buildContext()

    const handler = listByOrg as unknown as ConvexHandler<
      { clerkOrgId: string; type: string },
      unknown[]
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      type: "PURCHASE_ORDER",
    })

    expect(result).toEqual([
      expect.objectContaining({
        id: "order-1",
        supplierName: "Fournisseur A",
        items: [expect.objectContaining({ productName: "Produit A" })],
      }),
    ])
  })

  it("creates procurement orders and items", async () => {
    const ctx = buildContext()

    const handler = create as unknown as ConvexHandler<{
      clerkOrgId: string
      type: string
      supplierId: string
      status: string
      channel: string
      orderDate: number
      totalAmount: number
      items: Array<{ productId: string; quantity: number; unitPrice: number }>
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      type: "PURCHASE_ORDER",
      supplierId: "supplier-1",
      status: "ORDERED",
      channel: "EMAIL",
      orderDate: 123,
      totalAmount: 100,
      items: [{ productId: "product-1", quantity: 2, unitPrice: 50 }],
    })

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "procurementOrders",
      expect.objectContaining({
        pharmacyId: "pharmacy-1",
        supplierId: "supplier-1",
        status: "ORDERED",
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "procurementItems",
      expect.objectContaining({
        orderId: "order-1",
        productId: "product-1",
        lineTotal: 100,
      })
    )
  })

  it("updates procurement orders and replaces items", async () => {
    const ctx = buildContext()

    const handler = update as unknown as ConvexHandler<{
      clerkOrgId: string
      id: string
      supplierId: string
      status: string
      channel: string
      orderDate: number
      totalAmount: number
      items: Array<{ productId: string; quantity: number; unitPrice: number }>
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      id: "order-1",
      supplierId: "supplier-1",
      status: "DELIVERED",
      channel: "PHONE",
      orderDate: 456,
      totalAmount: 50,
      items: [{ productId: "product-1", quantity: 1, unitPrice: 50 }],
    })

    expect(ctx.db.patch).toHaveBeenCalledWith("order-1", {
      supplierId: "supplier-1",
      status: "DELIVERED",
      externalReference: undefined,
      channel: "PHONE",
      orderDate: 456,
      totalAmount: 50,
    })
    expect(ctx.db.delete).toHaveBeenCalledWith("item-1")
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "procurementItems",
      expect.objectContaining({ orderId: "order-1", quantity: 1 })
    )
  })

  it("removes procurement orders and items", async () => {
    const ctx = buildContext()

    const handler = remove as unknown as ConvexHandler<{ clerkOrgId: string; id: string }>

    await handler(ctx, { clerkOrgId: "org-1", id: "order-1" })

    expect(ctx.db.delete).toHaveBeenCalledWith("item-1")
    expect(ctx.db.delete).toHaveBeenCalledWith("order-1")
  })
})

function buildContext() {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }
  const supplier = {
    _id: "supplier-1",
    pharmacyId: "pharmacy-1",
    name: "Fournisseur A",
  }
  const product = {
    _id: "product-1",
    name: "Produit A",
  }
  const order = {
    _id: "order-1",
    pharmacyId: "pharmacy-1",
    supplierId: "supplier-1",
    type: "PURCHASE_ORDER",
    status: "ORDERED",
    channel: "EMAIL",
    createdAt: 100,
    orderDate: 200,
    totalAmount: 100,
  }
  const item = {
    _id: "item-1",
    orderId: "order-1",
    productId: "product-1",
    quantity: 2,
    unitPrice: 50,
  }

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
            filter: () => ({
              collect: async () => [order],
            }),
          }),
        }
      }
      if (table === "procurementItems") {
        return {
          withIndex: () => ({
            collect: async () => [item],
          }),
        }
      }
      return {
        withIndex: () => ({
          unique: async () => null,
          collect: async () => [],
        }),
      }
    }),
    get: vi.fn(async (id: string) => {
      if (id === "supplier-1") return supplier
      if (id === "product-1") return product
      if (id === "order-1") return order
      return null
    }),
    insert: vi.fn(async (table: string) => {
      if (table === "procurementOrders") {
        return "order-1"
      }
      return "item-1"
    }),
    patch: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1" }),
    },
    db,
  }
}
