import { vi } from "vitest"

import { getSummary } from "@/convex/dashboard"

type SummaryResult = {
  sales: {
    revenue: number
    transactions: number
    trend: number
  }
  cash: {
    status: string
    floatAmount: number
  }
  stockAlerts: {
    total: number
    ruptures: number
    lowStock: number
  }
  orders: {
    pending: number
    delivered: number
  }
  trendData: Record<
    "7J" | "30J" | "TRIM",
    Array<{ date: string; isoDate: string; revenue: number }>
  >
  recentSales: Array<{ client: string; payment: string }>
  recentOrders: Array<{ supplier: string; status: string }>
} | null

type ConvexHandler<Args, Result = unknown> = (ctx: unknown, args: Args) => Promise<Result>

describe("convex/dashboard", () => {
  it("returns null when org mismatch", async () => {
    const ctx = buildContext({ orgId: "org-2" })

    const handler = getSummary as unknown as ConvexHandler<{ clerkOrgId: string }, SummaryResult>

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toBeNull()
  })

  it("builds dashboard summary from data", async () => {
    const now = new Date("2026-01-03T10:00:00Z").getTime()
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)

    const ctx = buildContext()

    const handler = getSummary as unknown as ConvexHandler<{ clerkOrgId: string }, SummaryResult>

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toEqual(
      expect.objectContaining({
        sales: expect.objectContaining({
          revenue: 200,
          transactions: 1,
          trend: 100,
        }),
        cash: expect.objectContaining({
          status: "Fermée",
          floatAmount: 500,
        }),
        stockAlerts: expect.objectContaining({
          total: 2,
          ruptures: 1,
          lowStock: 2,
        }),
        orders: expect.objectContaining({
          pending: 1,
          delivered: 1,
        }),
      })
    )

    expect(result?.trendData["7J"]).toHaveLength(7)
    expect(result?.recentSales[0]).toEqual(
      expect.objectContaining({
        client: "Client A",
        payment: "Cash",
      })
    )
    expect(result?.recentOrders[0]).toEqual(
      expect.objectContaining({
        supplier: "Fournisseur A",
        status: "En cours",
      })
    )

    nowSpy.mockRestore()
  })
})

type BuildContextOptions = {
  orgId?: string
}

function buildContext(options: BuildContextOptions = {}) {
  const orgId = options.orgId ?? "org-1"
  const now = new Date("2026-01-03T10:00:00Z").getTime()
  const yesterday = now - 24 * 60 * 60 * 1000

  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }

  const sales = [
    {
      _id: "sale-1",
      pharmacyId: "pharmacy-1",
      saleDate: now,
      totalAmountTtc: 200,
      paymentMethod: "CASH",
      clientId: "client-1",
    },
    {
      _id: "sale-2",
      pharmacyId: "pharmacy-1",
      saleDate: yesterday,
      totalAmountTtc: 100,
      paymentMethod: "CARD",
      clientId: null,
    },
  ]

  const products = [
    {
      _id: "product-1",
      pharmacyId: "pharmacy-1",
      name: "Produit A",
      stockQuantity: 0,
      lowStockThreshold: 2,
    },
    {
      _id: "product-2",
      pharmacyId: "pharmacy-1",
      name: "Produit B",
      stockQuantity: 1,
      lowStockThreshold: 3,
    },
  ]

  const orders = [
    {
      _id: "order-1",
      pharmacyId: "pharmacy-1",
      supplierId: "supplier-1",
      status: "ORDERED",
      createdAt: now,
      totalAmount: 120,
    },
    {
      _id: "order-2",
      pharmacyId: "pharmacy-1",
      supplierId: "supplier-1",
      status: "DELIVERED",
      createdAt: yesterday,
      totalAmount: 80,
    },
  ]

  const cashDays = [
    {
      _id: "cash-1",
      pharmacyId: "pharmacy-1",
      date: "2026-01-03",
      opening: 500,
      isLocked: true,
    },
  ]

  const db = {
    query: vi.fn((table: string) => {
      if (table === "pharmacies") {
        return {
          withIndex: () => ({
            unique: async () => (orgId === "org-1" ? pharmacy : null),
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
      if (table === "cashReconciliations") {
        return {
          withIndex: () => ({
            collect: async () => cashDays,
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
    get: vi.fn(async (id: string) => {
      if (id === "client-1") {
        return { _id: "client-1", name: "Client A" }
      }
      if (id === "supplier-1") {
        return { _id: "supplier-1", name: "Fournisseur A" }
      }
      return null
    }),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId }),
    },
    db,
  }
}
