import {
  backfillIdentifiers,
  backfillProcurementItemPharmacy,
  backfillSaleItemPharmacy,
} from "@/convex/migrations"

type ConvexHandler<Args, Result = unknown> = (ctx: unknown, args: Args) => Promise<Result>

describe("convex/migrations", () => {
  it("backfills identifier sequences for missing records", async () => {
    const ctx = buildContext()
    const handler = backfillIdentifiers as unknown as ConvexHandler<
      { clerkOrgId: string },
      {
        pharmacies: number
        sales: number
        clients: number
        suppliers: number
        cashReconciliations: number
        purchaseOrders: number
        deliveryNotes: number
      }
    >

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toEqual({
      pharmacies: 1,
      sales: 1,
      clients: 1,
      suppliers: 1,
      cashReconciliations: 1,
      purchaseOrders: 1,
      deliveryNotes: 1,
    })

    expect(ctx.db.patch).toHaveBeenCalledWith("pharmacy-1", {
      pharmacyNumber: "PHARM-01",
      pharmacySequence: 1,
    })
    expect(ctx.db.patch).toHaveBeenCalledWith("sale-2", {
      saleNumber: "FAC-02",
      saleSequence: 2,
    })
    expect(ctx.db.patch).toHaveBeenCalledWith("client-2", {
      clientNumber: "CLI-02",
      clientSequence: 2,
    })
    expect(ctx.db.patch).toHaveBeenCalledWith("supplier-1", {
      supplierNumber: "FOUR-01",
      supplierSequence: 1,
    })
    expect(ctx.db.patch).toHaveBeenCalledWith("cash-1", {
      cashNumber: "CASH-01",
      cashSequence: 1,
    })
    expect(ctx.db.patch).toHaveBeenCalledWith("order-1", {
      orderNumber: "BC-01",
      orderSequence: 1,
    })
    expect(ctx.db.patch).toHaveBeenCalledWith("order-2", {
      orderNumber: "BL-01",
      orderSequence: 1,
    })
  })

  it("backfills pharmacy ids on procurement items", async () => {
    const ctx = buildProcurementItemContext()
    const handler = backfillProcurementItemPharmacy as unknown as ConvexHandler<
      { clerkOrgId: string },
      number
    >

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toBe(1)
    expect(ctx.db.patch).toHaveBeenCalledWith("item-1", { pharmacyId: "pharmacy-1" })
  })

  it("backfills pharmacy ids on sale items", async () => {
    const ctx = buildSaleItemContext()
    const handler = backfillSaleItemPharmacy as unknown as ConvexHandler<
      { clerkOrgId: string },
      number
    >

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toBe(1)
    expect(ctx.db.patch).toHaveBeenCalledWith("sale-item-1", { pharmacyId: "pharmacy-1" })
  })
})

function buildContext() {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
    createdAt: 10,
  }
  const sales = [
    {
      _id: "sale-1",
      pharmacyId: "pharmacy-1",
      saleDate: 100,
      saleNumber: "FAC-01",
      saleSequence: 1,
      createdAt: 100,
    },
    {
      _id: "sale-2",
      pharmacyId: "pharmacy-1",
      saleDate: 200,
      createdAt: 200,
    },
  ]
  const clients = [
    {
      _id: "client-1",
      pharmacyId: "pharmacy-1",
      clientNumber: "CLI-01",
      clientSequence: 1,
      createdAt: 100,
    },
    {
      _id: "client-2",
      pharmacyId: "pharmacy-1",
      createdAt: 200,
    },
  ]
  const suppliers = [
    {
      _id: "supplier-1",
      pharmacyId: "pharmacy-1",
      createdAt: 100,
    },
  ]
  const cashReconciliations = [
    {
      _id: "cash-1",
      pharmacyId: "pharmacy-1",
      date: "2026-01-01",
      createdAt: 100,
    },
  ]
  const procurementOrders = [
    {
      _id: "order-1",
      pharmacyId: "pharmacy-1",
      type: "PURCHASE_ORDER",
      createdAt: 100,
    },
    {
      _id: "order-2",
      pharmacyId: "pharmacy-1",
      type: "DELIVERY_NOTE",
      createdAt: 200,
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
      if (table === "sales") {
        return {
          withIndex: () => ({
            collect: async () => sales,
          }),
        }
      }
      if (table === "clients") {
        return {
          withIndex: () => ({
            collect: async () => clients,
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
      if (table === "cashReconciliations") {
        return {
          withIndex: () => ({
            collect: async () => cashReconciliations,
          }),
        }
      }
      if (table === "procurementOrders") {
        return {
          withIndex: () => ({
            collect: async () => procurementOrders,
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
    patch: vi.fn(async () => {}),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1" }),
    },
    db,
  }
}

function buildProcurementItemContext() {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }
  const orders = [
    {
      _id: "order-1",
      pharmacyId: "pharmacy-1",
    },
  ]
  const items = [
    {
      _id: "item-1",
      orderId: "order-1",
    },
    {
      _id: "item-2",
      orderId: "order-1",
      pharmacyId: "pharmacy-1",
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
            collect: async () => orders,
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
          unique: async () => null,
        }),
      }
    }),
    patch: vi.fn(async () => {}),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1" }),
    },
    db,
  }
}

function buildSaleItemContext() {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }
  const sales = [
    {
      _id: "sale-1",
      pharmacyId: "pharmacy-1",
    },
  ]
  const items = [
    {
      _id: "sale-item-1",
      saleId: "sale-1",
    },
    {
      _id: "sale-item-2",
      saleId: "sale-1",
      pharmacyId: "pharmacy-1",
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
      if (table === "sales") {
        return {
          withIndex: () => ({
            collect: async () => sales,
          }),
        }
      }
      if (table === "saleItems") {
        return {
          withIndex: () => ({
            collect: async () => items,
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
    patch: vi.fn(async () => {}),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1" }),
    },
    db,
  }
}
