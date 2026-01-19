import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess, getAuthOrgId } from "./auth"

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

    return ctx.db.insert("products", {
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
      createdAt: Date.now(),
    })
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
