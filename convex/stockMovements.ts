import { v } from "convex/values"

import { getAuthOrgId } from "./auth"
import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"
import { query } from "./_generated/server"

const stockMovementTypeValidator = v.union(
  v.literal("PRODUCT_INITIAL_STOCK"),
  v.literal("PRODUCT_STOCK_EDIT"),
  v.literal("DELIVERY_NOTE_STOCK_SYNC"),
  v.literal("SALE_STOCK_SYNC"),
  v.literal("MANUAL_STOCK_ADJUSTMENT"),
  v.literal("STOCKTAKE_STOCK_SYNC")
)

export type StockMovementType =
  | "PRODUCT_INITIAL_STOCK"
  | "PRODUCT_STOCK_EDIT"
  | "DELIVERY_NOTE_STOCK_SYNC"
  | "SALE_STOCK_SYNC"
  | "MANUAL_STOCK_ADJUSTMENT"
  | "STOCKTAKE_STOCK_SYNC"

type RecordStockMovementArgs = {
  pharmacyId: Id<"pharmacies">
  productId: Id<"products">
  productNameSnapshot: string
  delta: number
  movementType: StockMovementType
  reason?: string
  sourceId?: string
  lotNumber?: string
  lotExpiryDate?: number
  createdByClerkUserId?: string
  createdAt?: number
}

export async function recordStockMovement(ctx: MutationCtx, args: RecordStockMovementArgs) {
  if (!args.delta) return

  await ctx.db.insert("stockMovements", {
    pharmacyId: args.pharmacyId,
    productId: args.productId,
    productNameSnapshot: args.productNameSnapshot,
    delta: args.delta,
    movementType: args.movementType,
    reason: args.reason,
    sourceId: args.sourceId,
    lotNumber: args.lotNumber,
    lotExpiryDate: args.lotExpiryDate,
    createdByClerkUserId: args.createdByClerkUserId ?? "system",
    createdAt: args.createdAt ?? Date.now(),
  })
}

export const listByOrgPaginated = query({
  args: {
    clerkOrgId: v.string(),
    pagination: v.object({
      page: v.number(),
      pageSize: v.number(),
    }),
    filters: v.optional(
      v.object({
        productIds: v.optional(v.array(v.id("products"))),
        types: v.optional(v.array(stockMovementTypeValidator)),
        from: v.optional(v.number()),
        to: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const orgId = getAuthOrgId(identity)
    if (!orgId || orgId !== args.clerkOrgId) {
      return {
        items: [],
        totalCount: 0,
        filterOptions: { productIds: [], types: [] },
      }
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      return {
        items: [],
        totalCount: 0,
        filterOptions: { productIds: [], types: [] },
      }
    }

    const records = await ctx.db
      .query("stockMovements")
      .withIndex("by_pharmacyId_createdAt", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    const productOptions = Array.from(
      new Set(records.map((record) => String(record.productId)))
    ).sort((left, right) => left.localeCompare(right))
    const typeOptions = Array.from(new Set(records.map((record) => record.movementType))).sort()

    const productFilters = new Set((args.filters?.productIds ?? []).map((id) => String(id)))
    const typeFilters = new Set(args.filters?.types ?? [])
    const from = args.filters?.from
    const to = args.filters?.to

    const filtered = records
      .filter((record) => {
        if (productFilters.size > 0 && !productFilters.has(String(record.productId))) {
          return false
        }
        if (typeFilters.size > 0 && !typeFilters.has(record.movementType)) {
          return false
        }
        if (typeof from === "number" && record.createdAt < from) {
          return false
        }
        if (typeof to === "number" && record.createdAt > to) {
          return false
        }
        return true
      })
      .sort((left, right) => right.createdAt - left.createdAt)

    const totalCount = filtered.length
    const start = (args.pagination.page - 1) * args.pagination.pageSize
    const items = filtered.slice(start, start + args.pagination.pageSize).map((record) => ({
      id: record._id,
      productId: record.productId,
      productName: record.productNameSnapshot,
      delta: record.delta,
      movementType: record.movementType,
      reason: record.reason ?? null,
      sourceId: record.sourceId ?? null,
      lotNumber: record.lotNumber ?? null,
      lotExpiryDate: record.lotExpiryDate ?? null,
      createdByClerkUserId: record.createdByClerkUserId,
      createdAt: record.createdAt,
    }))

    return {
      items,
      totalCount,
      filterOptions: {
        productIds: productOptions,
        types: typeOptions,
      },
    }
  },
})
