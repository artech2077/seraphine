import { mutation, query } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"
import { v } from "convex/values"
import { assertOrgAccess, getAuthOrgId } from "./auth"
import { recordStockMovement } from "./stockMovements"

type ProductRecord = Doc<"products">

type StockStatus = "En stock" | "Stock bas" | "Rupture"

function getStockStatus(record: ProductRecord): StockStatus {
  if (record.stockQuantity === 0) return "Rupture"
  if (record.stockQuantity <= record.lowStockThreshold) return "Stock bas"
  return "En stock"
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

    return ctx.db
      .query("products")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()
  },
})

export const listByOrgPaginated = query({
  args: {
    clerkOrgId: v.string(),
    pagination: v.object({
      page: v.number(),
      pageSize: v.number(),
    }),
    filters: v.optional(
      v.object({
        names: v.optional(v.array(v.string())),
        barcodes: v.optional(v.array(v.string())),
        suppliers: v.optional(v.array(v.string())),
        categories: v.optional(v.array(v.string())),
        stockStatuses: v.optional(v.array(v.string())),
        vatRates: v.optional(v.array(v.number())),
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
        filterOptions: { names: [], barcodes: [], suppliers: [], categories: [] },
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
        filterOptions: { names: [], barcodes: [], suppliers: [], categories: [] },
      }
    }

    const records = (await ctx.db
      .query("products")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()) as ProductRecord[]

    const nameOptions = Array.from(new Set(records.map((record) => record.name)))
    const barcodeSet = new Set<string>()
    records.forEach((record) => {
      if (record.barcode) {
        barcodeSet.add(record.barcode)
      }
    })
    barcodeSet.add("Sans code barre")
    const barcodeOptions = Array.from(barcodeSet)
    const categoryOptions = Array.from(new Set(records.map((record) => record.category)))

    const nameFilter = new Set(args.filters?.names ?? [])
    const barcodeFilter = new Set(args.filters?.barcodes ?? [])
    const supplierFilter = new Set(args.filters?.suppliers ?? [])
    const categoryFilter = new Set(args.filters?.categories ?? [])
    const stockFilter = new Set(args.filters?.stockStatuses ?? [])
    const vatFilter = new Set(args.filters?.vatRates ?? [])

    const filtered = records.filter((record) => {
      if (nameFilter.size > 0 && !nameFilter.has(record.name)) {
        return false
      }
      if (barcodeFilter.size > 0) {
        const hasBarcode = Boolean(record.barcode)
        const matchBarcode = record.barcode ? barcodeFilter.has(record.barcode) : false
        const wantsMissing = barcodeFilter.has("Sans code barre")
        if (!matchBarcode && !(wantsMissing && !hasBarcode)) {
          return false
        }
      }
      if (supplierFilter.size > 0) {
        return false
      }
      if (categoryFilter.size > 0 && !categoryFilter.has(record.category)) {
        return false
      }
      if (stockFilter.size > 0 && !stockFilter.has("Tous")) {
        const status = getStockStatus(record)
        if (!stockFilter.has(status)) {
          return false
        }
      }
      if (vatFilter.size > 0 && !vatFilter.has(record.vatRate)) {
        return false
      }
      return true
    })

    const totalCount = filtered.length
    const start = (args.pagination.page - 1) * args.pagination.pageSize
    const items = filtered.slice(start, start + args.pagination.pageSize)

    return {
      items,
      totalCount,
      filterOptions: {
        names: nameOptions,
        barcodes: barcodeOptions,
        suppliers: [],
        categories: categoryOptions,
      },
    }
  },
})

export const create = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    barcode: v.optional(v.string()),
    category: v.string(),
    purchasePrice: v.number(),
    sellingPrice: v.number(),
    vatRate: v.number(),
    stockQuantity: v.number(),
    lowStockThreshold: v.number(),
    dosageForm: v.string(),
    internalNotes: v.optional(v.string()),
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

    const createdAt = Date.now()
    const productId = await ctx.db.insert("products", {
      pharmacyId: pharmacy._id,
      name: args.name,
      barcode: args.barcode ?? "",
      category: args.category,
      purchasePrice: args.purchasePrice,
      sellingPrice: args.sellingPrice,
      vatRate: args.vatRate,
      stockQuantity: args.stockQuantity,
      lowStockThreshold: args.lowStockThreshold,
      dosageForm: args.dosageForm,
      internalNotes: args.internalNotes,
      createdAt,
    })

    await recordStockMovement(ctx, {
      pharmacyId: pharmacy._id,
      productId,
      productNameSnapshot: args.name,
      delta: args.stockQuantity,
      movementType: "PRODUCT_INITIAL_STOCK",
      reason: "Stock initial du produit",
      sourceId: String(productId),
      createdByClerkUserId: identity.subject,
      createdAt,
    })

    return productId
  },
})

export const update = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("products"),
    name: v.string(),
    barcode: v.optional(v.string()),
    category: v.string(),
    purchasePrice: v.number(),
    sellingPrice: v.number(),
    vatRate: v.number(),
    stockQuantity: v.number(),
    lowStockThreshold: v.number(),
    dosageForm: v.string(),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const product = await ctx.db.get(args.id)
    if (!product) {
      throw new Error("Product not found")
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy || product.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    const delta = args.stockQuantity - product.stockQuantity

    await ctx.db.patch(args.id, {
      name: args.name,
      barcode: args.barcode ?? "",
      category: args.category,
      purchasePrice: args.purchasePrice,
      sellingPrice: args.sellingPrice,
      vatRate: args.vatRate,
      stockQuantity: args.stockQuantity,
      lowStockThreshold: args.lowStockThreshold,
      dosageForm: args.dosageForm,
      internalNotes: args.internalNotes,
    })

    await recordStockMovement(ctx, {
      pharmacyId: pharmacy._id,
      productId: args.id,
      productNameSnapshot: args.name,
      delta,
      movementType: "PRODUCT_STOCK_EDIT",
      reason: "Mise à jour manuelle du stock produit",
      sourceId: String(args.id),
      createdByClerkUserId: identity.subject,
    })
  },
})

export const adjustStock = mutation({
  args: {
    clerkOrgId: v.string(),
    productId: v.id("products"),
    direction: v.union(v.literal("IN"), v.literal("OUT")),
    quantity: v.number(),
    reason: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    if (args.quantity <= 0) {
      throw new Error("Adjustment quantity must be greater than 0")
    }

    const reason = args.reason.trim()
    if (!reason) {
      throw new Error("Adjustment reason is required")
    }

    const product = await ctx.db.get(args.productId)
    if (!product) {
      throw new Error("Product not found")
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy || product.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    const signedDelta = args.direction === "IN" ? args.quantity : -args.quantity
    const previousStock = product.stockQuantity
    const nextStock = previousStock + signedDelta
    if (nextStock < 0) {
      throw new Error(`Stock insuffisant pour ${product.name}`)
    }

    await ctx.db.patch(product._id, {
      stockQuantity: nextStock,
    })

    const note = args.note?.trim()
    const movementReason = note ? `${reason} (${note})` : reason
    await recordStockMovement(ctx, {
      pharmacyId: pharmacy._id,
      productId: product._id,
      productNameSnapshot: product.name,
      delta: signedDelta,
      movementType: "MANUAL_STOCK_ADJUSTMENT",
      reason: movementReason,
      sourceId: String(product._id),
      createdByClerkUserId: identity.subject,
    })

    return {
      productId: product._id,
      productName: product.name,
      previousStock,
      nextStock,
      delta: signedDelta,
    }
  },
})

export const remove = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("products"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const product = await ctx.db.get(args.id)
    if (!product) {
      return
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy || product.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    await ctx.db.delete(args.id)
  },
})
