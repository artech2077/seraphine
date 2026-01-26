import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess, getAuthOrgId } from "./auth"

const CASH_PREFIX = "CASH-"

type ReconciliationRecord = {
  _id: string
  cashNumber?: string
  cashSequence?: number
  date: string
  opening: number
  openingLocked: boolean
  sales: number
  withdrawals: number
  adjustments: number
  actual: number
  isLocked: boolean
  createdAt?: number
}

function formatCashNumber(sequence: number) {
  return `${CASH_PREFIX}${String(sequence).padStart(2, "0")}`
}

function parseCashNumber(value?: string | null) {
  if (!value) return null
  const match = value.match(/^CASH-(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

function buildFallbackNumbers(records: ReconciliationRecord[]) {
  const usedSequences = new Set<number>()
  records.forEach((record) => {
    const sequence = record.cashSequence ?? parseCashNumber(record.cashNumber) ?? 0
    if (sequence) {
      usedSequences.add(sequence)
    }
  })

  const fallbackNumbers = new Map<string, string>()
  const missing = records
    .filter((record) => !record.cashNumber && !record.cashSequence)
    .sort((a, b) => {
      const dateA = a.createdAt ?? Date.parse(a.date)
      const dateB = b.createdAt ?? Date.parse(b.date)
      return dateA - dateB
    })

  let nextSequence = 1
  missing.forEach((record) => {
    while (usedSequences.has(nextSequence)) {
      nextSequence += 1
    }
    fallbackNumbers.set(String(record._id), formatCashNumber(nextSequence))
    usedSequences.add(nextSequence)
    nextSequence += 1
  })

  return fallbackNumbers
}

function getStatus(record: ReconciliationRecord) {
  const expected = record.opening + record.sales - record.withdrawals + record.adjustments
  const difference = record.actual - expected
  if (difference === 0) return "Validé"
  if (difference < 0) return "Écart"
  return "Excédent"
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
      .query("cashReconciliations")
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
        from: v.optional(v.number()),
        to: v.optional(v.number()),
        status: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const orgId = getAuthOrgId(identity)
    if (!orgId || orgId !== args.clerkOrgId) {
      return { items: [], totalCount: 0, fallbackNumbers: {} }
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      return { items: [], totalCount: 0, fallbackNumbers: {} }
    }

    const records = (await ctx.db
      .query("cashReconciliations")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()) as ReconciliationRecord[]

    const statusFilter = args.filters?.status
    const from = args.filters?.from
    const to = args.filters?.to

    const filtered = records.filter((record) => {
      if (statusFilter && statusFilter !== "Tous" && getStatus(record) !== statusFilter) {
        return false
      }
      if (typeof from === "number") {
        const recordDate = Date.parse(record.date)
        if (Number.isNaN(recordDate) || recordDate < from) {
          return false
        }
      }
      if (typeof to === "number") {
        const recordDate = Date.parse(record.date)
        if (Number.isNaN(recordDate) || recordDate > to) {
          return false
        }
      }
      return true
    })

    const totalCount = filtered.length
    const start = (args.pagination.page - 1) * args.pagination.pageSize
    const items = filtered.slice(start, start + args.pagination.pageSize)

    const fallbackNumbers = buildFallbackNumbers(records)
    const pagedFallbackNumbers: Record<string, string> = {}
    items.forEach((record) => {
      const fallback = fallbackNumbers.get(String(record._id))
      if (fallback) {
        pagedFallbackNumbers[String(record._id)] = fallback
      }
    })

    return { items, totalCount, fallbackNumbers: pagedFallbackNumbers }
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
      .withIndex("by_pharmacyId_date", (q) =>
        q.eq("pharmacyId", pharmacy._id).eq("date", args.date)
      )
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

    const records = await ctx.db
      .query("cashReconciliations")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    const maxSequence = records.reduce((max, record) => {
      const sequence = record.cashSequence ?? parseCashNumber(record.cashNumber) ?? 0
      return Math.max(max, sequence)
    }, records.length)
    const cashSequence = maxSequence + 1

    return ctx.db.insert("cashReconciliations", {
      pharmacyId: pharmacy._id,
      cashNumber: formatCashNumber(cashSequence),
      cashSequence,
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
