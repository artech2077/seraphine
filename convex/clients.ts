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
      .query("clients")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()
  },
})

export const create = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    creditLimit: v.number(),
    outstandingBalance: v.number(),
    accountStatus: v.union(v.literal("OK"), v.literal("SURVEILLE"), v.literal("BLOQUE")),
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

    return ctx.db.insert("clients", {
      pharmacyId: pharmacy._id,
      name: args.name,
      phone: args.phone,
      city: args.city,
      creditLimit: args.creditLimit,
      outstandingBalance: args.outstandingBalance,
      accountStatus: args.accountStatus,
      internalNotes: args.internalNotes,
      createdAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("clients"),
    name: v.string(),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    creditLimit: v.number(),
    outstandingBalance: v.number(),
    accountStatus: v.union(v.literal("OK"), v.literal("SURVEILLE"), v.literal("BLOQUE")),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const client = await ctx.db.get(args.id)
    if (!client) {
      throw new Error("Client not found")
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy || client.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      phone: args.phone,
      city: args.city,
      creditLimit: args.creditLimit,
      outstandingBalance: args.outstandingBalance,
      accountStatus: args.accountStatus,
      internalNotes: args.internalNotes,
    })
  },
})

export const remove = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const client = await ctx.db.get(args.id)
    if (!client) {
      return
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy || client.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    await ctx.db.delete(args.id)
  },
})
