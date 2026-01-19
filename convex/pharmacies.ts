import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess } from "./auth"

export const ensureForOrg = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)
    const existing = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (existing) {
      return existing._id
    }

    return ctx.db.insert("pharmacies", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      createdAt: Date.now(),
    })
  },
})
