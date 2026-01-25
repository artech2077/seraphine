import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess } from "./auth"

const PHARMACY_PREFIX = "PHARM-"

function formatPharmacyNumber(sequence: number) {
  return `${PHARMACY_PREFIX}${String(sequence).padStart(2, "0")}`
}

function parsePharmacyNumber(value?: string | null) {
  if (!value) return null
  const match = value.match(/^PHARM-(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

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

    const pharmacies = await ctx.db.query("pharmacies").collect()
    const maxSequence = pharmacies.reduce((max, pharmacy) => {
      const sequence =
        pharmacy.pharmacySequence ?? parsePharmacyNumber(pharmacy.pharmacyNumber) ?? 0
      return Math.max(max, sequence)
    }, pharmacies.length)
    const pharmacySequence = maxSequence + 1

    return ctx.db.insert("pharmacies", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      pharmacyNumber: formatPharmacyNumber(pharmacySequence),
      pharmacySequence,
      createdAt: Date.now(),
    })
  },
})
