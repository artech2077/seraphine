import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess, getAuthOrgId } from "./auth"

const SUPPLIER_PREFIX = "FOUR-"

type SupplierRecord = {
  _id: string
  supplierNumber?: string
  supplierSequence?: number
  name: string
  city?: string
  balance: number
  createdAt?: number
}

function formatSupplierNumber(sequence: number) {
  return `${SUPPLIER_PREFIX}${String(sequence).padStart(2, "0")}`
}

function parseSupplierNumber(value?: string | null) {
  if (!value) return null
  const match = value.match(/^FOUR-(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

function buildFallbackNumbers(records: SupplierRecord[]) {
  const usedSequences = new Set<number>()
  records.forEach((record) => {
    const sequence = record.supplierSequence ?? parseSupplierNumber(record.supplierNumber) ?? 0
    if (sequence) {
      usedSequences.add(sequence)
    }
  })

  const fallbackNumbers = new Map<string, string>()
  const missing = records
    .filter((record) => !record.supplierNumber && !record.supplierSequence)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))

  let nextSequence = 1
  missing.forEach((record) => {
    while (usedSequences.has(nextSequence)) {
      nextSequence += 1
    }
    fallbackNumbers.set(String(record._id), formatSupplierNumber(nextSequence))
    usedSequences.add(nextSequence)
    nextSequence += 1
  })

  return fallbackNumbers
}

function getBalanceStatus(balance: number) {
  if (balance > 0) return "Positive"
  if (balance < 0) return "Negative"
  return "Zero"
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
      .query("suppliers")
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
        cities: v.optional(v.array(v.string())),
        balances: v.optional(v.array(v.string())),
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
        filterOptions: { names: [], cities: [] },
        fallbackNumbers: {},
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
        filterOptions: { names: [], cities: [] },
        fallbackNumbers: {},
      }
    }

    const records = (await ctx.db
      .query("suppliers")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()) as SupplierRecord[]

    const nameOptions = Array.from(new Set(records.map((record) => record.name)))
    const cityOptions = Array.from(new Set(records.map((record) => record.city ?? "")))

    const nameFilter = new Set(args.filters?.names ?? [])
    const cityFilter = new Set(args.filters?.cities ?? [])
    const balanceFilter = new Set(args.filters?.balances ?? [])

    const filtered = records.filter((record) => {
      if (nameFilter.size > 0 && !nameFilter.has(record.name)) {
        return false
      }
      const city = record.city ?? ""
      if (cityFilter.size > 0 && !cityFilter.has(city)) {
        return false
      }
      if (balanceFilter.size > 0) {
        const status = getBalanceStatus(record.balance)
        if (!balanceFilter.has(status)) {
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

    return {
      items,
      totalCount,
      filterOptions: { names: nameOptions, cities: cityOptions },
      fallbackNumbers: pagedFallbackNumbers,
    }
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

    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    const maxSequence = suppliers.reduce((max, supplier) => {
      const sequence =
        supplier.supplierSequence ?? parseSupplierNumber(supplier.supplierNumber) ?? 0
      return Math.max(max, sequence)
    }, suppliers.length)

    const supplierSequence = maxSequence + 1

    return ctx.db.insert("suppliers", {
      pharmacyId: pharmacy._id,
      supplierNumber: formatSupplierNumber(supplierSequence),
      supplierSequence,
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
