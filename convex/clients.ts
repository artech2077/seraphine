import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess, getAuthOrgId } from "./auth"

const CLIENT_PREFIX = "CLI-"
const accountStatusValidator = v.union(v.literal("OK"), v.literal("SURVEILLE"), v.literal("BLOQUE"))

type ClientRecord = {
  _id: string
  clientNumber?: string
  clientSequence?: number
  name: string
  city?: string
  accountStatus: "OK" | "SURVEILLE" | "BLOQUE"
  createdAt?: number
}

function formatClientNumber(sequence: number) {
  return `${CLIENT_PREFIX}${String(sequence).padStart(2, "0")}`
}

function parseClientNumber(value?: string | null) {
  if (!value) return null
  const match = value.match(/^CLI-(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

function buildFallbackNumbers(records: ClientRecord[]) {
  const usedSequences = new Set<number>()
  records.forEach((record) => {
    const sequence = record.clientSequence ?? parseClientNumber(record.clientNumber) ?? 0
    if (sequence) {
      usedSequences.add(sequence)
    }
  })

  const fallbackNumbers = new Map<string, string>()
  const missing = records
    .filter((record) => !record.clientNumber && !record.clientSequence)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))

  let nextSequence = 1
  missing.forEach((record) => {
    while (usedSequences.has(nextSequence)) {
      nextSequence += 1
    }
    fallbackNumbers.set(String(record._id), formatClientNumber(nextSequence))
    usedSequences.add(nextSequence)
    nextSequence += 1
  })

  return fallbackNumbers
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
      .query("clients")
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
        statuses: v.optional(v.array(accountStatusValidator)),
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
      .query("clients")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()) as ClientRecord[]

    const nameOptions = Array.from(new Set(records.map((record) => record.name)))
    const cityOptions = Array.from(new Set(records.map((record) => record.city ?? "")))

    const nameFilter = new Set(args.filters?.names ?? [])
    const cityFilter = new Set(args.filters?.cities ?? [])
    const statusFilter = new Set(args.filters?.statuses ?? [])

    const filtered = records.filter((record) => {
      if (nameFilter.size > 0 && !nameFilter.has(record.name)) {
        return false
      }
      const city = record.city ?? ""
      if (cityFilter.size > 0 && !cityFilter.has(city)) {
        return false
      }
      if (statusFilter.size > 0 && !statusFilter.has(record.accountStatus)) {
        return false
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

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    const maxSequence = clients.reduce((max, client) => {
      const sequence = client.clientSequence ?? parseClientNumber(client.clientNumber) ?? 0
      return Math.max(max, sequence)
    }, clients.length)

    const clientSequence = maxSequence + 1

    return ctx.db.insert("clients", {
      pharmacyId: pharmacy._id,
      clientNumber: formatClientNumber(clientSequence),
      clientSequence,
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
