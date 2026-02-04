import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess, getAuthOrgId } from "./auth"
import type { Doc, Id } from "./_generated/dataModel"

const SALE_NUMBER_PREFIX = "FAC-"

type SaleRecord = Doc<"sales">
type SaleItemRecord = Doc<"saleItems">

function formatSaleNumber(sequence: number) {
  return `${SALE_NUMBER_PREFIX}${String(sequence).padStart(2, "0")}`
}

function parseSaleNumber(value?: string | null) {
  if (!value) return null
  const match = value.match(/^FAC-(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

function buildFallbackNumbers(records: SaleRecord[]) {
  const usedSequences = new Set<number>()
  records.forEach((sale) => {
    const sequence = sale.saleSequence ?? parseSaleNumber(sale.saleNumber) ?? 0
    if (sequence) {
      usedSequences.add(sequence)
    }
  })

  const fallbackNumbers = new Map<string, string>()
  const missing = records
    .filter((sale) => !sale.saleNumber && !sale.saleSequence)
    .sort((a, b) => {
      const dateA = a.createdAt ?? a.saleDate
      const dateB = b.createdAt ?? b.saleDate
      return dateA - dateB
    })

  let nextSequence = 1
  missing.forEach((sale) => {
    while (usedSequences.has(nextSequence)) {
      nextSequence += 1
    }
    fallbackNumbers.set(String(sale._id), formatSaleNumber(nextSequence))
    usedSequences.add(nextSequence)
    nextSequence += 1
  })

  return fallbackNumbers
}

function getPaymentLabel(paymentMethod: SaleRecord["paymentMethod"]) {
  switch (paymentMethod) {
    case "CARD":
      return "Carte"
    case "CHECK":
      return "Carte"
    case "CREDIT":
      return "Crédit"
    default:
      return "Espèce"
  }
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

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    if (sales.length === 0) {
      return []
    }

    const [clients, users, items] = await Promise.all([
      ctx.db
        .query("clients")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db.query("users").collect(),
      ctx.db
        .query("saleItems")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
    ])

    const clientsById = new Map(clients.map((client) => [client._id, client]))
    const usersById = new Map(users.map((user) => [user._id, user]))

    const itemsBySale = new Map<string, typeof items>()
    items.forEach((item) => {
      const saleItems = itemsBySale.get(item.saleId) ?? []
      saleItems.push(item)
      itemsBySale.set(item.saleId, saleItems)
    })

    const missingItemSales = sales.filter((sale) => !itemsBySale.has(sale._id))
    if (missingItemSales.length > 0) {
      const fallbackItems = await Promise.all(
        missingItemSales.map(async (sale) => ({
          saleId: sale._id,
          items: await ctx.db
            .query("saleItems")
            .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
            .collect(),
        }))
      )

      fallbackItems.forEach(({ saleId, items: saleItems }) => {
        if (saleItems.length === 0) {
          return
        }
        const existingItems = itemsBySale.get(saleId) ?? []
        itemsBySale.set(saleId, [...existingItems, ...saleItems])
      })
    }

    return sales.map((sale) => {
      const client = sale.clientId ? clientsById.get(sale.clientId) : null
      const seller = usersById.get(sale.sellerId)
      const saleItems = itemsBySale.get(sale._id) ?? []

      return {
        ...sale,
        clientName: client?.name,
        sellerName: seller?.name,
        items: saleItems,
      }
    })
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
        clients: v.optional(v.array(v.string())),
        sellers: v.optional(v.array(v.string())),
        products: v.optional(v.array(v.string())),
        payments: v.optional(v.array(v.string())),
        discountOnly: v.optional(v.boolean()),
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
        filterOptions: { clients: [], sellers: [], products: [] },
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
        filterOptions: { clients: [], sellers: [], products: [] },
        fallbackNumbers: {},
      }
    }

    const sales = (await ctx.db
      .query("sales")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()) as SaleRecord[]

    if (sales.length === 0) {
      return {
        items: [],
        totalCount: 0,
        filterOptions: { clients: [], sellers: [], products: [] },
        fallbackNumbers: {},
      }
    }

    const [clients, users, items] = await Promise.all([
      ctx.db
        .query("clients")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db.query("users").collect(),
      ctx.db
        .query("saleItems")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
    ])

    const clientsById = new Map(clients.map((client) => [String(client._id), client]))
    const usersById = new Map(users.map((user) => [String(user._id), user]))

    const itemsBySale = new Map<string, SaleItemRecord[]>()
    ;(items as SaleItemRecord[]).forEach((item) => {
      const saleItems = itemsBySale.get(String(item.saleId)) ?? []
      saleItems.push(item)
      itemsBySale.set(String(item.saleId), saleItems)
    })

    const missingItemSales = sales.filter((sale) => !itemsBySale.has(String(sale._id)))
    if (missingItemSales.length > 0) {
      const fallbackItems = await Promise.all(
        missingItemSales.map(async (sale) => ({
          saleId: String(sale._id),
          items: await ctx.db
            .query("saleItems")
            .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
            .collect(),
        }))
      )

      fallbackItems.forEach(({ saleId, items: saleItems }) => {
        if (saleItems.length === 0) {
          return
        }
        const existingItems = itemsBySale.get(saleId) ?? []
        itemsBySale.set(saleId, [...existingItems, ...(saleItems as SaleItemRecord[])])
      })
    }

    const enrichedSales = sales.map((sale) => {
      const client = sale.clientId ? clientsById.get(String(sale.clientId)) : null
      const seller = usersById.get(String(sale.sellerId))
      const saleItems = itemsBySale.get(String(sale._id)) ?? []

      return {
        ...sale,
        clientName: client?.name,
        sellerName: seller?.name,
        items: saleItems,
      }
    })

    const clientOptions = Array.from(new Set(enrichedSales.map((sale) => sale.clientName ?? "-")))
    const sellerOptions = Array.from(new Set(enrichedSales.map((sale) => sale.sellerName ?? "-")))
    const productSet = new Set<string>()
    enrichedSales.forEach((sale) =>
      sale.items.forEach((item) => productSet.add(item.productNameSnapshot))
    )
    const productOptions = Array.from(productSet)

    const clientFilter = new Set(args.filters?.clients ?? [])
    const sellerFilter = new Set(args.filters?.sellers ?? [])
    const productFilter = new Set(args.filters?.products ?? [])
    const paymentFilter = new Set(args.filters?.payments ?? [])
    const discountOnly = Boolean(args.filters?.discountOnly)
    const from = args.filters?.from
    const to = args.filters?.to

    const filtered = enrichedSales.filter((sale) => {
      const clientName = sale.clientName ?? "-"
      if (clientFilter.size > 0 && !clientFilter.has(clientName)) {
        return false
      }
      const sellerName = sale.sellerName ?? "-"
      if (sellerFilter.size > 0 && !sellerFilter.has(sellerName)) {
        return false
      }
      if (paymentFilter.size > 0 && !paymentFilter.has(getPaymentLabel(sale.paymentMethod))) {
        return false
      }
      if (productFilter.size > 0) {
        const hasProduct = sale.items.some((item) => productFilter.has(item.productNameSnapshot))
        if (!hasProduct) {
          return false
        }
      }
      if (discountOnly && (sale.globalDiscountValue ?? 0) <= 0) {
        return false
      }
      if (typeof from === "number" && sale.saleDate < from) {
        return false
      }
      if (typeof to === "number" && sale.saleDate > to) {
        return false
      }
      return true
    })

    const totalCount = filtered.length
    const start = (args.pagination.page - 1) * args.pagination.pageSize
    const itemsPage = filtered.slice(start, start + args.pagination.pageSize)

    const fallbackNumbers = buildFallbackNumbers(sales)
    const pagedFallbackNumbers: Record<string, string> = {}
    itemsPage.forEach((sale) => {
      const fallback = fallbackNumbers.get(String(sale._id))
      if (fallback) {
        pagedFallbackNumbers[String(sale._id)] = fallback
      }
    })

    return {
      items: itemsPage,
      totalCount,
      filterOptions: {
        clients: clientOptions,
        sellers: sellerOptions,
        products: productOptions,
      },
      fallbackNumbers: pagedFallbackNumbers,
    }
  },
})

export const create = mutation({
  args: {
    clerkOrgId: v.string(),
    saleDate: v.number(),
    clientId: v.optional(v.id("clients")),
    paymentMethod: v.union(
      v.literal("CASH"),
      v.literal("CARD"),
      v.literal("CHECK"),
      v.literal("CREDIT")
    ),
    globalDiscountType: v.optional(v.union(v.literal("PERCENT"), v.literal("AMOUNT"))),
    globalDiscountValue: v.optional(v.number()),
    totalAmountHt: v.number(),
    totalAmountTtc: v.number(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productNameSnapshot: v.string(),
        quantity: v.number(),
        unitPriceHt: v.number(),
        vatRate: v.number(),
        lineDiscountType: v.optional(v.union(v.literal("PERCENT"), v.literal("AMOUNT"))),
        lineDiscountValue: v.optional(v.number()),
        totalLineTtc: v.number(),
      })
    ),
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

    const existingSales = await ctx.db
      .query("sales")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    const maxSequence = existingSales.reduce((max, sale) => {
      const sequence = sale.saleSequence ?? parseSaleNumber(sale.saleNumber) ?? 0
      return Math.max(max, sequence)
    }, existingSales.length)

    const saleSequence = maxSequence + 1
    const saleNumber = formatSaleNumber(saleSequence)

    const clerkUserId = identity.subject
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()

    const sellerId =
      existingUser?._id ??
      (await ctx.db.insert("users", {
        clerkUserId,
        name: identity.name ?? "Utilisateur",
        email: identity.email ?? undefined,
        createdAt: Date.now(),
      }))

    const saleId = await ctx.db.insert("sales", {
      pharmacyId: pharmacy._id,
      clientId: args.clientId,
      sellerId,
      saleDate: args.saleDate,
      saleNumber,
      saleSequence,
      paymentMethod: args.paymentMethod,
      globalDiscountType: args.globalDiscountType,
      globalDiscountValue: args.globalDiscountValue,
      totalAmountHt: args.totalAmountHt,
      totalAmountTtc: args.totalAmountTtc,
      createdAt: Date.now(),
    })

    await Promise.all(
      args.items.map((item) =>
        ctx.db.insert("saleItems", {
          pharmacyId: pharmacy._id,
          saleId,
          productId: item.productId,
          productNameSnapshot: item.productNameSnapshot,
          quantity: item.quantity,
          unitPriceHt: item.unitPriceHt,
          vatRate: item.vatRate,
          lineDiscountType: item.lineDiscountType,
          lineDiscountValue: item.lineDiscountValue,
          totalLineTtc: item.totalLineTtc,
        })
      )
    )

    return saleId
  },
})

export const update = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("sales"),
    clientId: v.optional(v.id("clients")),
    paymentMethod: v.union(
      v.literal("CASH"),
      v.literal("CARD"),
      v.literal("CHECK"),
      v.literal("CREDIT")
    ),
    globalDiscountType: v.optional(v.union(v.literal("PERCENT"), v.literal("AMOUNT"))),
    globalDiscountValue: v.optional(v.number()),
    totalAmountHt: v.number(),
    totalAmountTtc: v.number(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productNameSnapshot: v.string(),
        quantity: v.number(),
        unitPriceHt: v.number(),
        vatRate: v.number(),
        lineDiscountType: v.optional(v.union(v.literal("PERCENT"), v.literal("AMOUNT"))),
        lineDiscountValue: v.optional(v.number()),
        totalLineTtc: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const sale = await ctx.db.get(args.id)
    if (!sale) {
      return
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy || sale.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    await ctx.db.patch(args.id, {
      clientId: args.clientId,
      paymentMethod: args.paymentMethod,
      globalDiscountType: args.globalDiscountType,
      globalDiscountValue: args.globalDiscountValue,
      totalAmountHt: args.totalAmountHt,
      totalAmountTtc: args.totalAmountTtc,
    })

    const existingItems = await ctx.db
      .query("saleItems")
      .withIndex("by_saleId", (q) => q.eq("saleId", args.id))
      .collect()

    await Promise.all(existingItems.map((item) => ctx.db.delete(item._id)))

    await Promise.all(
      args.items.map((item) =>
        ctx.db.insert("saleItems", {
          pharmacyId: pharmacy._id,
          saleId: args.id,
          productId: item.productId,
          productNameSnapshot: item.productNameSnapshot,
          quantity: item.quantity,
          unitPriceHt: item.unitPriceHt,
          vatRate: item.vatRate,
          lineDiscountType: item.lineDiscountType,
          lineDiscountValue: item.lineDiscountValue,
          totalLineTtc: item.totalLineTtc,
        })
      )
    )
  },
})

export const remove = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("sales"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const sale = await ctx.db.get(args.id)
    if (!sale) {
      return
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy || sale.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    const items = await ctx.db
      .query("saleItems")
      .withIndex("by_saleId", (q) => q.eq("saleId", args.id))
      .collect()

    await Promise.all(items.map((item) => ctx.db.delete(item._id)))
    await ctx.db.delete(args.id)
  },
})
