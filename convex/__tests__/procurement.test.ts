import { vi } from "vitest"

import { create, listByOrg, listByOrgPaginated, remove, update } from "@/convex/procurement"
import { getHandler, type ConvexHandler } from "@/convex/__tests__/test_utils"

describe("convex/procurement", () => {
  it("lists procurement orders with mapped items", async () => {
    const ctx = buildContext()

    const handler = getHandler(listByOrg) as ConvexHandler<
      { clerkOrgId: string; type: string },
      unknown[]
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      type: "PURCHASE_ORDER",
    })

    expect(ctx.mocks.procurementOrdersIndex).toHaveBeenCalledWith(
      "by_pharmacyId_type",
      expect.any(Function)
    )
    expect(result).toEqual([
      expect.objectContaining({
        id: "order-1",
        orderNumber: "BC-01",
        supplierId: "supplier-1",
        supplierName: "Fournisseur A",
        items: [expect.objectContaining({ productId: "product-1", productName: "Produit A" })],
      }),
    ])
  })

  it("creates procurement orders without remise fields", async () => {
    const ctx = buildContext()

    const handler = getHandler(create) as ConvexHandler<{
      clerkOrgId: string
      type: string
      supplierId: string
      status: string
      channel: string
      orderDate: number
      dueDate?: number
      globalDiscountType?: string
      globalDiscountValue?: number
      totalAmount: number
      items: Array<{
        productId: string
        quantity: number
        unitPrice: number
        lineDiscountType?: string
        lineDiscountValue?: number
      }>
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      type: "PURCHASE_ORDER",
      supplierId: "supplier-1",
      status: "ORDERED",
      channel: "EMAIL",
      orderDate: 123,
      dueDate: 150,
      globalDiscountType: "PERCENT",
      globalDiscountValue: 10,
      totalAmount: 100,
      items: [
        {
          productId: "product-1",
          quantity: 2,
          unitPrice: 50,
          lineDiscountType: "AMOUNT",
          lineDiscountValue: 10,
        },
      ],
    })

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "procurementOrders",
      expect.objectContaining({
        pharmacyId: "pharmacy-1",
        orderNumber: "BC-02",
        orderSequence: 2,
        supplierId: "supplier-1",
        status: "ORDERED",
        dueDate: undefined,
        globalDiscountType: undefined,
        globalDiscountValue: 0,
        totalAmount: 100,
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "procurementItems",
      expect.objectContaining({
        pharmacyId: "pharmacy-1",
        orderId: "order-1",
        productId: "product-1",
        lineDiscountType: undefined,
        lineDiscountValue: 0,
        lineTotal: 100,
      })
    )
  })

  it("updates procurement orders and strips remise fields", async () => {
    const ctx = buildContext()

    const handler = getHandler(update) as ConvexHandler<{
      clerkOrgId: string
      id: string
      supplierId: string
      status: string
      channel: string
      orderDate: number
      dueDate?: number
      globalDiscountType?: string
      globalDiscountValue?: number
      totalAmount: number
      items: Array<{
        productId: string
        quantity: number
        unitPrice: number
        lineDiscountType?: string
        lineDiscountValue?: number
      }>
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      id: "order-1",
      supplierId: "supplier-1",
      status: "DELIVERED",
      channel: "PHONE",
      orderDate: 456,
      dueDate: 500,
      globalDiscountType: "AMOUNT",
      globalDiscountValue: 5,
      totalAmount: 50,
      items: [
        {
          productId: "product-1",
          quantity: 1,
          unitPrice: 50,
          lineDiscountType: "PERCENT",
          lineDiscountValue: 10,
        },
      ],
    })

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({
        supplierId: "supplier-1",
        status: "DELIVERED",
        externalReference: undefined,
        channel: "PHONE",
        orderDate: 456,
        dueDate: undefined,
        globalDiscountType: undefined,
        globalDiscountValue: 0,
        totalAmount: 50,
      })
    )
    expect(ctx.db.delete).toHaveBeenCalledWith("item-1")
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "procurementItems",
      expect.objectContaining({
        pharmacyId: "pharmacy-1",
        orderId: "order-1",
        quantity: 1,
        lineDiscountType: undefined,
        lineDiscountValue: 0,
        lineTotal: 50,
      })
    )
  })

  it("paginates procurement orders", async () => {
    const ctx = buildContext()

    const handler = getHandler(listByOrgPaginated) as ConvexHandler<
      {
        clerkOrgId: string
        type: "PURCHASE_ORDER"
        pagination: { page: number; pageSize: number }
        filters?: { supplierNames?: string[] }
      },
      { items: unknown[]; totalCount: number; filterOptions: { suppliers: string[] } }
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      type: "PURCHASE_ORDER",
      pagination: { page: 1, pageSize: 10 },
      filters: { supplierNames: ["Fournisseur A"] },
    })

    expect(result.totalCount).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.filterOptions.suppliers).toEqual(["Fournisseur A"])
  })

  it("removes procurement orders and items", async () => {
    const ctx = buildContext()

    const handler = getHandler(remove) as ConvexHandler<{ clerkOrgId: string; id: string }>

    await handler(ctx, { clerkOrgId: "org-1", id: "order-1" })

    expect(ctx.db.delete).toHaveBeenCalledWith("item-1")
    expect(ctx.db.delete).toHaveBeenCalledWith("order-1")
  })

  it("clears low stock alert when alert draft is ordered", async () => {
    const ctx = buildAlertContext()

    const handler = getHandler(update) as ConvexHandler<{
      clerkOrgId: string
      id: string
      supplierId: string
      status: string
      channel: string
      orderDate: number
      dueDate?: number
      globalDiscountType?: string
      globalDiscountValue?: number
      totalAmount: number
      items: Array<{
        productId: string
        quantity: number
        unitPrice: number
        lineDiscountType?: string
        lineDiscountValue?: number
      }>
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      id: "order-1",
      supplierId: "supplier-1",
      status: "ORDERED",
      channel: "PHONE",
      orderDate: 456,
      totalAmount: 50,
      items: [
        {
          productId: "product-1",
          quantity: 1,
          unitPrice: 50,
        },
      ],
    })

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "pharmacy-1",
      expect.objectContaining({
        lowStockAlertOrderId: undefined,
        lowStockAlertSignature: undefined,
        lowStockAlertHandledSignature: "product-1",
      })
    )
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
    pharmacyId: "pharmacy-1",
    name: "Produit A",
  }
  const order = {
    _id: "order-1",
    pharmacyId: "pharmacy-1",
    orderNumber: "BC-01",
    orderSequence: 1,
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
    pharmacyId: "pharmacy-1",
    orderId: "order-1",
    productId: "product-1",
    quantity: 2,
    unitPrice: 50,
  }
  const procurementOrdersIndex = vi.fn(() => ({
    collect: async () => [order],
  }))

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
          withIndex: procurementOrdersIndex,
        }
      }
      if (table === "suppliers") {
        return {
          withIndex: () => ({
            collect: async () => [supplier],
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
      if (table === "products") {
        return {
          withIndex: () => ({
            collect: async () => [product],
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
    mocks: {
      procurementOrdersIndex,
    },
  }
}

function buildAlertContext() {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
    lowStockAlertOrderId: "order-1",
    lowStockAlertSignature: "product-1",
  }
  const supplier = {
    _id: "supplier-1",
    pharmacyId: "pharmacy-1",
    name: "Fournisseur A",
  }
  const product = {
    _id: "product-1",
    pharmacyId: "pharmacy-1",
    name: "Produit A",
    stockQuantity: 1,
    lowStockThreshold: 2,
  }
  const order = {
    _id: "order-1",
    pharmacyId: "pharmacy-1",
    orderNumber: "BC-01",
    orderSequence: 1,
    supplierId: "supplier-1",
    type: "PURCHASE_ORDER",
    status: "DRAFT",
    channel: "EMAIL",
    createdAt: 100,
    orderDate: 200,
    totalAmount: 100,
  }
  const item = {
    _id: "item-1",
    pharmacyId: "pharmacy-1",
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
      if (table === "procurementItems") {
        return {
          withIndex: () => ({
            collect: async () => [item],
          }),
        }
      }
      if (table === "products") {
        return {
          withIndex: () => ({
            collect: async () => [product],
          }),
        }
      }
      return {
        withIndex: () => ({
          collect: async () => [],
        }),
      }
    }),
    get: vi.fn(async (id: string) => {
      if (id === "supplier-1") return supplier
      if (id === "order-1") return order
      return null
    }),
    insert: vi.fn(async () => "item-1"),
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
