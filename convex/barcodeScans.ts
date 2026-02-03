import { v } from "convex/values"

import { query, mutation } from "./_generated/server"
import { assertOrgAccess } from "./auth"

const MAX_RECENT_MS = 30_000

function normalizeBarcode(value: string) {
  return value.replace(/\s+/g, "")
}

export const create = mutation({
  args: {
    clerkOrgId: v.string(),
    barcode: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const normalized = normalizeBarcode(args.barcode)
    if (!normalized) {
      throw new Error("Barcode is required")
    }

    return ctx.db.insert("barcodeScans", {
      clerkOrgId: args.clerkOrgId,
      clerkUserId: identity.subject,
      barcode: normalized,
      source: args.source,
      createdAt: Date.now(),
    })
  },
})

export const latestForUser = query({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const latest = await ctx.db
      .query("barcodeScans")
      .withIndex("by_clerkOrgId_userId_createdAt", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId).eq("clerkUserId", identity.subject)
      )
      .order("desc")
      .first()

    if (!latest) return null
    if (Date.now() - latest.createdAt > MAX_RECENT_MS) return null

    return {
      _id: latest._id,
      barcode: latest.barcode,
      createdAt: latest.createdAt,
      source: latest.source,
    }
  },
})
