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
      .query("cashReconciliations")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()
  },
})

export const upsertDay = mutation({
  args: {
    clerkOrgId: v.string(),
    date: v.string(),
    opening: v.number(),
    openingLocked: v.boolean(),
    sales: v.number(),
    withdrawals: v.number(),
    adjustments: v.number(),
    actual: v.number(),
    isLocked: v.boolean(),
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

    const existing = await ctx.db
      .query("cashReconciliations")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .filter((q) => q.eq(q.field("date"), args.date))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        opening: args.opening,
        openingLocked: args.openingLocked,
        sales: args.sales,
        withdrawals: args.withdrawals,
        adjustments: args.adjustments,
        actual: args.actual,
        isLocked: args.isLocked,
      })
      return existing._id
    }

    return ctx.db.insert("cashReconciliations", {
      pharmacyId: pharmacy._id,
      date: args.date,
      opening: args.opening,
      openingLocked: args.openingLocked,
      sales: args.sales,
      withdrawals: args.withdrawals,
      adjustments: args.adjustments,
      actual: args.actual,
      isLocked: args.isLocked,
      createdAt: Date.now(),
    })
  },
})
