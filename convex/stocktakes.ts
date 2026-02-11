import { v } from "convex/values"

import { assertOrgAccess, getAuthOrgId } from "./auth"
import type { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { recordStockMovement } from "./stockMovements"

function defaultStocktakeName(timestamp: number) {
  return `Inventaire ${new Date(timestamp).toISOString().slice(0, 10)}`
}

export const listByOrg = query({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const orgId = getAuthOrgId(identity)
    if (!orgId || orgId !== args.clerkOrgId) {
      return []
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      return []
    }

    const [sessions, items] = await Promise.all([
      ctx.db
        .query("stocktakes")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("stocktakeItems")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
    ])

    const metricsBySession = new Map<
      string,
      {
        itemsCount: number
        countedCount: number
        varianceCount: number
      }
    >()
    items.forEach((item) => {
      const key = String(item.stocktakeId)
      const metrics = metricsBySession.get(key) ?? {
        itemsCount: 0,
        countedCount: 0,
        varianceCount: 0,
      }
      metrics.itemsCount += 1
      if (typeof item.countedQuantity === "number") {
        metrics.countedCount += 1
      }
      if ((item.varianceQuantity ?? 0) !== 0) {
        metrics.varianceCount += 1
      }
      metricsBySession.set(key, metrics)
    })

    return sessions
      .sort((left, right) => right.createdAt - left.createdAt)
      .map((session) => {
        const metrics = metricsBySession.get(String(session._id)) ?? {
          itemsCount: 0,
          countedCount: 0,
          varianceCount: 0,
        }

        return {
          id: session._id,
          name: session.name,
          status: session.status,
          createdAt: session.createdAt,
          startedAt: session.startedAt ?? null,
          finalizedAt: session.finalizedAt ?? null,
          ...metrics,
        }
      })
  },
})

export const getById = query({
  args: {
    clerkOrgId: v.string(),
    id: v.id("stocktakes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const orgId = getAuthOrgId(identity)
    if (!orgId || orgId !== args.clerkOrgId) {
      return null
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      return null
    }

    const stocktake = await ctx.db.get(args.id)
    if (!stocktake || stocktake.pharmacyId !== pharmacy._id) {
      return null
    }

    const items = await ctx.db
      .query("stocktakeItems")
      .withIndex("by_stocktakeId", (q) => q.eq("stocktakeId", args.id))
      .collect()

    const mappedItems = items
      .map((item) => ({
        id: item._id,
        productId: item.productId,
        productName: item.productNameSnapshot,
        expectedQuantity: item.expectedQuantity,
        countedQuantity: item.countedQuantity ?? null,
        varianceQuantity: item.varianceQuantity ?? null,
        note: item.note ?? "",
      }))
      .sort((left, right) => left.productName.localeCompare(right.productName, "fr"))

    return {
      id: stocktake._id,
      name: stocktake.name,
      status: stocktake.status,
      createdAt: stocktake.createdAt,
      startedAt: stocktake.startedAt ?? null,
      finalizedAt: stocktake.finalizedAt ?? null,
      items: mappedItems,
    }
  },
})

export const createSession = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      throw new Error("Pharmacy not found")
    }

    const now = Date.now()
    const name = args.name?.trim() || defaultStocktakeName(now)
    const stocktakeId = await ctx.db.insert("stocktakes", {
      pharmacyId: pharmacy._id,
      name,
      status: "DRAFT",
      createdByClerkUserId: identity.subject,
      createdAt: now,
      startedAt: undefined,
      finalizedAt: undefined,
    })

    const products = await ctx.db
      .query("products")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    await Promise.all(
      products.map((product) =>
        ctx.db.insert("stocktakeItems", {
          pharmacyId: pharmacy._id,
          stocktakeId,
          productId: product._id,
          productNameSnapshot: product.name,
          expectedQuantity: product.stockQuantity,
          countedQuantity: undefined,
          varianceQuantity: undefined,
          note: undefined,
        })
      )
    )

    return stocktakeId
  },
})

export const startSession = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("stocktakes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      throw new Error("Pharmacy not found")
    }

    const stocktake = await ctx.db.get(args.id)
    if (!stocktake || stocktake.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }
    if (stocktake.status !== "DRAFT") {
      throw new Error("Only draft stocktakes can be started")
    }

    await ctx.db.patch(stocktake._id, {
      status: "COUNTING",
      startedAt: Date.now(),
    })
  },
})

export const finalizeSession = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("stocktakes"),
    counts: v.array(
      v.object({
        productId: v.id("products"),
        countedQuantity: v.number(),
        note: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      throw new Error("Pharmacy not found")
    }

    const stocktake = await ctx.db.get(args.id)
    if (!stocktake || stocktake.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }
    if (stocktake.status === "FINALIZED") {
      throw new Error("Stocktake already finalized")
    }
    if (stocktake.status !== "COUNTING") {
      throw new Error("Stocktake must be started before finalizing")
    }

    const sessionItems = await ctx.db
      .query("stocktakeItems")
      .withIndex("by_stocktakeId", (q) => q.eq("stocktakeId", args.id))
      .collect()

    const countsByProduct = new Map<
      string,
      {
        countedQuantity: number
        note?: string
      }
    >()
    args.counts.forEach((count) => {
      if (count.countedQuantity < 0) {
        throw new Error("Counted quantity must be zero or greater")
      }
      countsByProduct.set(String(count.productId), {
        countedQuantity: count.countedQuantity,
        note: count.note?.trim() || undefined,
      })
    })

    const sessionProductIds = new Set(sessionItems.map((item) => String(item.productId)))
    Array.from(countsByProduct.keys()).forEach((productId) => {
      if (!sessionProductIds.has(productId)) {
        throw new Error("Invalid stocktake product")
      }
    })

    const itemPatches: Array<{
      itemId: Id<"stocktakeItems">
      countedQuantity: number
      varianceQuantity: number
      note?: string
    }> = []
    const productPatches: Array<{
      productId: Id<"products">
      nextStockQuantity: number
      delta: number
      productName: string
    }> = []

    for (const item of sessionItems) {
      const provided = countsByProduct.get(String(item.productId))
      const countedQuantity =
        provided?.countedQuantity ?? item.countedQuantity ?? item.expectedQuantity
      const varianceQuantity = countedQuantity - item.expectedQuantity
      const note = provided?.note ?? item.note ?? undefined

      itemPatches.push({
        itemId: item._id,
        countedQuantity,
        varianceQuantity,
        note,
      })

      if (!varianceQuantity) {
        continue
      }

      const product = await ctx.db.get(item.productId)
      if (!product || product.pharmacyId !== pharmacy._id) {
        throw new Error("Unauthorized")
      }
      const nextStockQuantity = product.stockQuantity + varianceQuantity
      if (nextStockQuantity < 0) {
        throw new Error(`Stock insuffisant pour ${product.name}`)
      }

      productPatches.push({
        productId: product._id,
        nextStockQuantity,
        delta: varianceQuantity,
        productName: product.name,
      })
    }

    await Promise.all(
      itemPatches.map((patch) =>
        ctx.db.patch(patch.itemId, {
          countedQuantity: patch.countedQuantity,
          varianceQuantity: patch.varianceQuantity,
          note: patch.note,
        })
      )
    )

    await Promise.all(
      productPatches.map(async (patch) => {
        await ctx.db.patch(patch.productId, {
          stockQuantity: patch.nextStockQuantity,
        })

        await recordStockMovement(ctx, {
          pharmacyId: pharmacy._id,
          productId: patch.productId,
          productNameSnapshot: patch.productName,
          delta: patch.delta,
          movementType: "STOCKTAKE_STOCK_SYNC",
          reason: `Finalisation inventaire: ${stocktake.name}`,
          sourceId: String(stocktake._id),
          createdByClerkUserId: identity.subject,
        })
      })
    )

    await ctx.db.patch(stocktake._id, {
      status: "FINALIZED",
      finalizedAt: Date.now(),
    })

    return {
      stocktakeId: stocktake._id,
      updatedProductsCount: productPatches.length,
    }
  },
})
