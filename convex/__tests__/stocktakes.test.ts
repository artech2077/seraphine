import { vi } from "vitest"

import {
  createSession,
  finalizeSession,
  getById,
  listByOrg,
  startSession,
} from "@/convex/stocktakes"
import { getHandler, type ConvexHandler } from "@/convex/__tests__/test_utils"

describe("convex/stocktakes", () => {
  it("creates a stocktake, starts it, and finalizes with stock/movement updates", async () => {
    const ctx = buildContext({ initialStocktakeStatus: "DRAFT" })

    const createHandler = getHandler(createSession) as ConvexHandler<
      {
        clerkOrgId: string
        name?: string
      },
      string
    >
    const startHandler = getHandler(startSession) as ConvexHandler<{
      clerkOrgId: string
      id: string
    }>
    const finalizeHandler = getHandler(finalizeSession) as ConvexHandler<{
      clerkOrgId: string
      id: string
      counts: Array<{ productId: string; countedQuantity: number; note?: string }>
    }>

    const stocktakeId = await createHandler(ctx, {
      clerkOrgId: "org-1",
      name: "Comptage Janvier",
    })

    expect(ctx.state.stocktakes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _id: stocktakeId,
          name: "Comptage Janvier",
          status: "DRAFT",
        }),
      ])
    )
    expect(ctx.state.stocktakeItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stocktakeId,
          productId: "product-1",
        }),
        expect.objectContaining({
          stocktakeId,
          productId: "product-2",
        }),
      ])
    )

    await startHandler(ctx, { clerkOrgId: "org-1", id: stocktakeId })
    const createdStocktake = ctx.state.stocktakes.find((item) => item._id === stocktakeId)
    expect(createdStocktake?.status).toBe("COUNTING")

    const result = await finalizeHandler(ctx, {
      clerkOrgId: "org-1",
      id: stocktakeId,
      counts: [
        {
          productId: "product-1",
          countedQuantity: 3,
          note: "Ecart inventaire",
        },
        {
          productId: "product-2",
          countedQuantity: 8,
        },
      ],
    })

    expect(result).toEqual({
      stocktakeId,
      updatedProductsCount: 1,
    })
    expect(ctx.state.products.find((product) => product._id === "product-1")?.stockQuantity).toBe(3)
    expect(ctx.state.products.find((product) => product._id === "product-2")?.stockQuantity).toBe(8)
    expect(ctx.state.stocktakes.find((item) => item._id === stocktakeId)?.status).toBe("FINALIZED")
    expect(ctx.state.stockMovements).toEqual([
      expect.objectContaining({
        productId: "product-1",
        delta: -2,
        movementType: "STOCKTAKE_STOCK_SYNC",
        sourceId: stocktakeId,
      }),
    ])
  })

  it("returns sessions and details for org", async () => {
    const ctx = buildContext({
      initialStocktakeStatus: "COUNTING",
      stocktakeName: "Comptage Hebdo",
    })
    const listHandler = getHandler(listByOrg) as ConvexHandler<{ clerkOrgId: string }, unknown[]>
    const detailsHandler = getHandler(getById) as ConvexHandler<
      { clerkOrgId: string; id: string },
      unknown
    >

    const sessions = await listHandler(ctx, { clerkOrgId: "org-1" })
    expect(sessions).toEqual([
      expect.objectContaining({
        name: "Comptage Hebdo",
        status: "COUNTING",
        itemsCount: 2,
      }),
    ])

    const details = await detailsHandler(ctx, {
      clerkOrgId: "org-1",
      id: "stocktake-1",
    })
    expect(details).toEqual(
      expect.objectContaining({
        id: "stocktake-1",
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: "product-1",
            expectedQuantity: 5,
          }),
        ]),
      })
    )
  })

  it("blocks finalize when stocktake is already finalized", async () => {
    const ctx = buildContext({ initialStocktakeStatus: "FINALIZED" })
    const finalizeHandler = getHandler(finalizeSession) as ConvexHandler<{
      clerkOrgId: string
      id: string
      counts: Array<{ productId: string; countedQuantity: number; note?: string }>
    }>

    await expect(
      finalizeHandler(ctx, {
        clerkOrgId: "org-1",
        id: "stocktake-1",
        counts: [{ productId: "product-1", countedQuantity: 5 }],
      })
    ).rejects.toThrow("Stocktake already finalized")
  })

  it("blocks invalid products in finalize payload", async () => {
    const ctx = buildContext({ initialStocktakeStatus: "COUNTING" })
    const finalizeHandler = getHandler(finalizeSession) as ConvexHandler<{
      clerkOrgId: string
      id: string
      counts: Array<{ productId: string; countedQuantity: number; note?: string }>
    }>

    await expect(
      finalizeHandler(ctx, {
        clerkOrgId: "org-1",
        id: "stocktake-1",
        counts: [{ productId: "product-unknown", countedQuantity: 5 }],
      })
    ).rejects.toThrow("Invalid stocktake product")
  })
})

type BuildContextOptions = {
  orgId?: string
  pharmacyId?: string
  initialStocktakeStatus?: "DRAFT" | "COUNTING" | "FINALIZED"
  stocktakeName?: string
}

function buildContext(options: BuildContextOptions = {}) {
  const pharmacyId = options.pharmacyId ?? "pharmacy-1"
  const orgId = options.orgId ?? "org-1"
  const stocktakeStatus = options.initialStocktakeStatus ?? "COUNTING"

  const state = {
    pharmacy: {
      _id: pharmacyId,
      clerkOrgId: "org-1",
    },
    products: [
      {
        _id: "product-1",
        pharmacyId: "pharmacy-1",
        name: "Doliprane",
        stockQuantity: 5,
      },
      {
        _id: "product-2",
        pharmacyId: "pharmacy-1",
        name: "Smecta",
        stockQuantity: 8,
      },
    ],
    stocktakes: [
      {
        _id: "stocktake-1",
        pharmacyId: "pharmacy-1",
        name: options.stocktakeName ?? "Inventaire 2026-02-11",
        status: stocktakeStatus,
        createdByClerkUserId: "user-1",
        createdAt: 100,
        startedAt: stocktakeStatus === "DRAFT" ? undefined : 120,
        finalizedAt: stocktakeStatus === "FINALIZED" ? 150 : undefined,
      },
    ],
    stocktakeItems: [
      {
        _id: "stocktake-item-1",
        pharmacyId: "pharmacy-1",
        stocktakeId: "stocktake-1",
        productId: "product-1",
        productNameSnapshot: "Doliprane",
        expectedQuantity: 5,
        countedQuantity: undefined,
        varianceQuantity: undefined,
        note: undefined,
      },
      {
        _id: "stocktake-item-2",
        pharmacyId: "pharmacy-1",
        stocktakeId: "stocktake-1",
        productId: "product-2",
        productNameSnapshot: "Smecta",
        expectedQuantity: 8,
        countedQuantity: undefined,
        varianceQuantity: undefined,
        note: undefined,
      },
    ],
    stockMovements: [] as Array<Record<string, unknown>>,
  }

  let stocktakeCounter = 1
  let stocktakeItemCounter = 2

  function getIndexFilters(
    callback: (query: { eq: (field: string, value: unknown) => unknown }) => unknown
  ) {
    const filters = new Map<string, unknown>()
    const query = {
      eq(field: string, value: unknown) {
        filters.set(field, value)
        return query
      },
    }
    callback(query)
    return filters
  }

  const db = {
    query: vi.fn((table: string) => {
      if (table === "pharmacies") {
        return {
          withIndex: (
            _indexName: string,
            callback: (query: { eq: (field: string, value: unknown) => unknown }) => unknown
          ) => {
            const filters = getIndexFilters(callback)
            const clerkOrgId = filters.get("clerkOrgId")
            return {
              unique: async () =>
                orgId === "org-1" && clerkOrgId === "org-1" ? state.pharmacy : null,
            }
          },
        }
      }

      if (table === "products") {
        return {
          withIndex: (
            _indexName: string,
            callback: (query: { eq: (field: string, value: unknown) => unknown }) => unknown
          ) => {
            const filters = getIndexFilters(callback)
            const filteredPharmacyId = String(filters.get("pharmacyId") ?? "")
            return {
              collect: async () =>
                state.products.filter((product) => product.pharmacyId === filteredPharmacyId),
            }
          },
        }
      }

      if (table === "stocktakes") {
        return {
          withIndex: (
            indexName: string,
            callback: (query: { eq: (field: string, value: unknown) => unknown }) => unknown
          ) => {
            const filters = getIndexFilters(callback)
            const filteredPharmacyId = String(filters.get("pharmacyId") ?? "")
            if (indexName === "by_pharmacyId") {
              return {
                collect: async () =>
                  state.stocktakes.filter(
                    (stocktake) => stocktake.pharmacyId === filteredPharmacyId
                  ),
              }
            }
            if (indexName === "by_pharmacyId_status") {
              return {
                collect: async () =>
                  state.stocktakes.filter(
                    (stocktake) => stocktake.pharmacyId === filteredPharmacyId
                  ),
              }
            }
            return {
              collect: async () => [],
            }
          },
        }
      }

      if (table === "stocktakeItems") {
        return {
          withIndex: (
            indexName: string,
            callback: (query: { eq: (field: string, value: unknown) => unknown }) => unknown
          ) => {
            const filters = getIndexFilters(callback)
            const filteredStocktakeId = String(filters.get("stocktakeId") ?? "")
            const filteredPharmacyId = String(filters.get("pharmacyId") ?? "")
            if (indexName === "by_stocktakeId") {
              return {
                collect: async () =>
                  state.stocktakeItems.filter((item) => item.stocktakeId === filteredStocktakeId),
              }
            }
            if (indexName === "by_pharmacyId") {
              return {
                collect: async () =>
                  state.stocktakeItems.filter((item) => item.pharmacyId === filteredPharmacyId),
              }
            }
            return {
              collect: async () => [],
            }
          },
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
      const stocktake = state.stocktakes.find((item) => item._id === id)
      if (stocktake) return stocktake
      const product = state.products.find((item) => item._id === id)
      if (product) return product
      return null
    }),
    insert: vi.fn(async (table: string, value: Record<string, unknown>) => {
      if (table === "stocktakes") {
        stocktakeCounter += 1
        const id = `stocktake-${stocktakeCounter}`
        state.stocktakes.push({ _id: id, ...value } as (typeof state.stocktakes)[number])
        return id
      }
      if (table === "stocktakeItems") {
        stocktakeItemCounter += 1
        const id = `stocktake-item-${stocktakeItemCounter}`
        state.stocktakeItems.push({ _id: id, ...value } as (typeof state.stocktakeItems)[number])
        return id
      }
      if (table === "stockMovements") {
        state.stockMovements.push(value)
        return `movement-${state.stockMovements.length}`
      }
      return "id-1"
    }),
    patch: vi.fn(async (id: string, value: Record<string, unknown>) => {
      const stocktake = state.stocktakes.find((item) => item._id === id)
      if (stocktake) {
        Object.assign(stocktake, value)
      }
      const product = state.products.find((item) => item._id === id)
      if (product) {
        Object.assign(product, value)
      }
      const stocktakeItem = state.stocktakeItems.find((item) => item._id === id)
      if (stocktakeItem) {
        Object.assign(stocktakeItem, value)
      }
    }),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId, subject: "user-1" }),
    },
    db,
    state,
  }
}
