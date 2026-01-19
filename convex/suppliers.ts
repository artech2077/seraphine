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
      .query("suppliers")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()
  },
})

export const create = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    balance: v.number(),
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

    return ctx.db.insert("suppliers", {
      pharmacyId: pharmacy._id,
      name: args.name,
      email: args.email,
      phone: args.phone,
      city: args.city,
      balance: args.balance,
      internalNotes: args.internalNotes,
      createdAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("suppliers"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    balance: v.number(),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const supplier = await ctx.db.get(args.id)
    if (!supplier) {
      throw new Error("Supplier not found")
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy || supplier.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      email: args.email,
      phone: args.phone,
      city: args.city,
      balance: args.balance,
      internalNotes: args.internalNotes,
    })
  },
})

export const remove = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("suppliers"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const supplier = await ctx.db.get(args.id)
    if (!supplier) {
      return
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy || supplier.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    await ctx.db.delete(args.id)
  },
})
