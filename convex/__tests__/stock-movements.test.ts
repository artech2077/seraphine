import { vi } from "vitest"

import { getHandler, type ConvexHandler } from "@/convex/__tests__/test_utils"
import { listByOrgPaginated } from "@/convex/stockMovements"

describe("convex/stockMovements", () => {
  it("returns empty payload when org mismatch", async () => {
    const ctx = buildContext({ orgId: "org-2" })
    const handler = getHandler(listByOrgPaginated) as ConvexHandler<
      {
        clerkOrgId: string
        pagination: { page: number; pageSize: number }
      },
      {
        items: unknown[]
        totalCount: number
        filterOptions: { productIds: string[]; types: string[] }
      }
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      pagination: { page: 1, pageSize: 10 },
    })

    expect(result).toEqual({
      items: [],
      totalCount: 0,
      filterOptions: { productIds: [], types: [] },
    })
  })

  it("filters and paginates movements sorted by newest first", async () => {
    const ctx = buildContext()
    const handler = getHandler(listByOrgPaginated) as ConvexHandler<
      {
        clerkOrgId: string
        pagination: { page: number; pageSize: number }
        filters?: {
          productIds?: string[]
          types?: Array<"PRODUCT_INITIAL_STOCK" | "PRODUCT_STOCK_EDIT" | "DELIVERY_NOTE_STOCK_SYNC">
          from?: number
          to?: number
        }
      },
      {
        items: Array<{ id: string; productId: string; movementType: string; createdAt: number }>
        totalCount: number
        filterOptions: { productIds: string[]; types: string[] }
      }
    >

    const pageResult = await handler(ctx, {
      clerkOrgId: "org-1",
      pagination: { page: 1, pageSize: 2 },
    })

    expect(pageResult.totalCount).toBe(3)
    expect(pageResult.items).toHaveLength(2)
    expect(pageResult.items[0]).toEqual(
      expect.objectContaining({
        id: "movement-3",
        productId: "product-2",
        movementType: "DELIVERY_NOTE_STOCK_SYNC",
        createdAt: 300,
      })
    )
    expect(pageResult.filterOptions.productIds).toEqual(["product-1", "product-2"])

    const filteredResult = await handler(ctx, {
      clerkOrgId: "org-1",
      pagination: { page: 1, pageSize: 10 },
      filters: {
        productIds: ["product-1"],
        types: ["PRODUCT_STOCK_EDIT"],
        from: 150,
        to: 250,
      },
    })

    expect(filteredResult.totalCount).toBe(1)
    expect(filteredResult.items[0]).toEqual(
      expect.objectContaining({
        id: "movement-2",
        productId: "product-1",
        movementType: "PRODUCT_STOCK_EDIT",
      })
    )
  })
})

type BuildContextOptions = {
  orgId?: string
}

function buildContext(options: BuildContextOptions = {}) {
  const orgId = options.orgId ?? "org-1"
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }

  const records = [
    {
      _id: "movement-1",
      pharmacyId: "pharmacy-1",
      productId: "product-1",
      productNameSnapshot: "Doliprane",
      delta: 10,
      movementType: "PRODUCT_INITIAL_STOCK",
      createdByClerkUserId: "user-1",
      createdAt: 100,
    },
    {
      _id: "movement-2",
      pharmacyId: "pharmacy-1",
      productId: "product-1",
      productNameSnapshot: "Doliprane",
      delta: -2,
      movementType: "PRODUCT_STOCK_EDIT",
      reason: "Correction",
      createdByClerkUserId: "user-1",
      createdAt: 200,
    },
    {
      _id: "movement-3",
      pharmacyId: "pharmacy-1",
      productId: "product-2",
      productNameSnapshot: "Smecta",
      delta: 4,
      movementType: "DELIVERY_NOTE_STOCK_SYNC",
      sourceId: "order-1",
      createdByClerkUserId: "user-2",
      createdAt: 300,
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

      if (table === "stockMovements") {
        return {
          withIndex: () => ({
            collect: async () => records,
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
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId }),
    },
    db,
  }
}
