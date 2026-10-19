import { mutation, query, type MutationCtx } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess, getAuthOrgId } from "./auth"
import type { Doc, Id } from "./_generated/dataModel"
import { recordStockMovement } from "./stockMovements"

const SALE_NUMBER_PREFIX = "FAC-"
const SALE_STOCK_MOVEMENT_TYPE = "SALE_STOCK_SYNC"

type SaleRecord = Doc<"sales">
type SaleItemRecord = Doc<"saleItems">
type SaleItemLotRecord = Doc<"saleItemLots">

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

function aggregateSaleQuantitiesByProduct(
  items: Array<{ productId: Id<"products">; quantity: number }>
) {
  const quantities = new Map<string, number>()
  items.forEach((item) => {
    const key = String(item.productId)
    const nextQuantity = (quantities.get(key) ?? 0) + item.quantity
    quantities.set(key, nextQuantity)
  })
  return quantities
}

function assertPositiveSaleQuantities(items: Array<{ quantity: number }>) {
  if (items.some((item) => item.quantity <= 0)) {
    throw new Error("Sale item quantity must be greater than 0")
  }
}

type SaleLineInput = {
  saleItemId: Id<"saleItems">
  productId: Id<"products">
  productNameSnapshot: string
  quantity: number
}

async function applyFefoDeductions(
  ctx: MutationCtx,
  pharmacyId: Id<"pharmacies">,
  saleId: Id<"sales">,
  saleItems: SaleLineInput[],
  movement: {
    reason: string
    sourceId: string
    createdByClerkUserId: string
  }
) {
  const linesByProduct = new Map<string, SaleLineInput[]>()
  saleItems.forEach((item) => {
    const key = String(item.productId)
    const current = linesByProduct.get(key) ?? []
    current.push(item)
    linesByProduct.set(key, current)
  })

  for (const [productKey, lines] of linesByProduct.entries()) {
    const productId = productKey as Id<"products">
    const product = await ctx.db.get(productId)
    if (!product || product.pharmacyId !== pharmacyId) {
      throw new Error("Unauthorized")
    }

    const requestedQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)
    if (requestedQuantity <= 0) {
      continue
    }

    const lots = await ctx.db
      .query("stockLots")
      .withIndex("by_pharmacyId_productId", (q) =>
        q.eq("pharmacyId", pharmacyId).eq("productId", product._id)
      )
      .collect()

    const availableLots = lots
      .filter((lot) => lot.quantity > 0)
      .sort((left, right) =>
        left.expiryDate === right.expiryDate
          ? left.lotNumber.localeCompare(right.lotNumber, "fr")
          : left.expiryDate - right.expiryDate
      )

    if (availableLots.length === 0) {
      const nextStockQuantity = product.stockQuantity - requestedQuantity
      if (nextStockQuantity < 0) {
        throw new Error(`Stock insuffisant pour ${product.name}`)
      }

      await ctx.db.patch(product._id, {
        stockQuantity: nextStockQuantity,
      })

      await recordStockMovement(ctx, {
        pharmacyId,
        productId: product._id,
        productNameSnapshot: product.name,
        delta: -requestedQuantity,
        movementType: SALE_STOCK_MOVEMENT_TYPE,
        reason: movement.reason,
        sourceId: movement.sourceId,
        createdByClerkUserId: movement.createdByClerkUserId,
      })
      continue
    }

    let remaining = requestedQuantity
    const lotConsumptions: Array<{
      lotId: Id<"stockLots">
      lotNumber: string
      expiryDate: number
      availableQuantity: number
      consumedQuantity: number
    }> = []

    for (const lot of availableLots) {
      if (remaining <= 0) break
      const consumedQuantity = Math.min(remaining, lot.quantity)
      if (consumedQuantity <= 0) continue
      lotConsumptions.push({
        lotId: lot._id,
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate,
        availableQuantity: lot.quantity,
        consumedQuantity,
      })
      remaining -= consumedQuantity
    }

    if (remaining > 0) {
      throw new Error(`Stock lot insuffisant pour ${product.name}`)
    }

    const allocations: Array<{
      saleItemId: Id<"saleItems">
      lotNumber: string
      expiryDate: number
      quantity: number
    }> = []
    let lotIndex = 0
    let lotRemaining = lotConsumptions[0]?.consumedQuantity ?? 0

    for (const line of lines) {
      let lineRemaining = line.quantity
      while (lineRemaining > 0) {
        const currentLot = lotConsumptions[lotIndex]
        if (!currentLot) {
          throw new Error(`Stock lot insuffisant pour ${product.name}`)
        }
        const allocatedQuantity = Math.min(lineRemaining, lotRemaining)
        allocations.push({
          saleItemId: line.saleItemId,
          lotNumber: currentLot.lotNumber,
          expiryDate: currentLot.expiryDate,
          quantity: allocatedQuantity,
        })
        lineRemaining -= allocatedQuantity
        lotRemaining -= allocatedQuantity
        if (lotRemaining <= 0) {
          lotIndex += 1
          lotRemaining = lotConsumptions[lotIndex]?.consumedQuantity ?? 0
        }
      }
    }

    await Promise.all(
      lotConsumptions.map((consumption) =>
        ctx.db.patch(consumption.lotId, {
          quantity: consumption.availableQuantity - consumption.consumedQuantity,
          updatedAt: Date.now(),
        })
      )
    )

    await ctx.db.patch(product._id, {
      stockQuantity: product.stockQuantity - requestedQuantity,
    })

    for (const allocation of allocations) {
      await ctx.db.insert("saleItemLots", {
        pharmacyId,
        saleId,
        saleItemId: allocation.saleItemId,
        productId: product._id,
        lotNumber: allocation.lotNumber,
        expiryDate: allocation.expiryDate,
        quantity: allocation.quantity,
        createdAt: Date.now(),
      })

      await recordStockMovement(ctx, {
        pharmacyId,
        productId: product._id,
        productNameSnapshot: product.name,
        delta: -allocation.quantity,
        movementType: SALE_STOCK_MOVEMENT_TYPE,
        reason: `${movement.reason} (FEFO)`,
        sourceId: movement.sourceId,
        lotNumber: allocation.lotNumber,
        lotExpiryDate: allocation.expiryDate,
        createdByClerkUserId: movement.createdByClerkUserId,
      })
    }
  }
}

async function restoreSaleAllocations(
  ctx: MutationCtx,
  pharmacyId: Id<"pharmacies">,
  saleItems: SaleItemRecord[],
  saleItemLots: SaleItemLotRecord[],
  movement: {
    reason: string
    sourceId: string
    createdByClerkUserId: string
  }
) {
  if (saleItems.length === 0) {
    return
  }

  const quantitiesByProduct = aggregateSaleQuantitiesByProduct(
    saleItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }))
  )

  for (const [productId, quantity] of quantitiesByProduct.entries()) {
    const product = await ctx.db.get(productId as Id<"products">)
    if (!product || product.pharmacyId !== pharmacyId) {
      throw new Error("Unauthorized")
    }
    await ctx.db.patch(product._id, {
      stockQuantity: product.stockQuantity + quantity,
    })
  }

  for (const saleItemLot of saleItemLots) {
    const product = await ctx.db.get(saleItemLot.productId)
    if (!product || product.pharmacyId !== pharmacyId) {
      throw new Error("Unauthorized")
    }

    const existingLots = await ctx.db
      .query("stockLots")
      .withIndex("by_pharmacyId_productId_lotNumber", (q) =>
        q
          .eq("pharmacyId", pharmacyId)
          .eq("productId", saleItemLot.productId)
          .eq("lotNumber", saleItemLot.lotNumber)
      )
      .collect()

    const matchingLot = existingLots.find((lot) => lot.expiryDate === saleItemLot.expiryDate)
    if (matchingLot) {
      await ctx.db.patch(matchingLot._id, {
        quantity: matchingLot.quantity + saleItemLot.quantity,
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert("stockLots", {
        pharmacyId,
        productId: saleItemLot.productId,
        lotNumber: saleItemLot.lotNumber,
        expiryDate: saleItemLot.expiryDate,
        quantity: saleItemLot.quantity,
        sourceType: "MIGRATION",
        sourceOrderId: undefined,
        sourceItemId: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    await recordStockMovement(ctx, {
      pharmacyId,
      productId: saleItemLot.productId,
      productNameSnapshot: product.name,
      delta: saleItemLot.quantity,
      movementType: SALE_STOCK_MOVEMENT_TYPE,
      reason: `${movement.reason} (FEFO)`,
      sourceId: movement.sourceId,
      lotNumber: saleItemLot.lotNumber,
      lotExpiryDate: saleItemLot.expiryDate,
      createdByClerkUserId: movement.createdByClerkUserId,
    })
  }

  const allocatedSaleItemIds = new Set(saleItemLots.map((lot) => String(lot.saleItemId)))
  const unallocatedItems = saleItems.filter((item) => !allocatedSaleItemIds.has(String(item._id)))
  const unallocatedByProduct = aggregateSaleQuantitiesByProduct(
    unallocatedItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }))
  )

  for (const [productId, quantity] of unallocatedByProduct.entries()) {
    const product = await ctx.db.get(productId as Id<"products">)
    if (!product || product.pharmacyId !== pharmacyId) {
      throw new Error("Unauthorized")
    }

    await recordStockMovement(ctx, {
      pharmacyId,
      productId: product._id,
      productNameSnapshot: product.name,
      delta: quantity,
      movementType: SALE_STOCK_MOVEMENT_TYPE,
      reason: movement.reason,
      sourceId: movement.sourceId,
      createdByClerkUserId: movement.createdByClerkUserId,
    })
  }
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
    assertPositiveSaleQuantities(args.items)

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

    const createdItems = await Promise.all(
      args.items.map(async (item) => {
        const saleItemId = await ctx.db.insert("saleItems", {
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

        return {
          saleItemId,
          productId: item.productId,
          productNameSnapshot: item.productNameSnapshot,
          quantity: item.quantity,
        }
      })
    )

    await applyFefoDeductions(ctx, pharmacy._id, saleId, createdItems, {
      reason: "Création de vente",
      sourceId: String(saleId),
      createdByClerkUserId: identity.subject,
    })

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
    assertPositiveSaleQuantities(args.items)

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

    const [existingItems, existingItemLots] = await Promise.all([
      ctx.db
        .query("saleItems")
        .withIndex("by_saleId", (q) => q.eq("saleId", args.id))
        .collect(),
      ctx.db
        .query("saleItemLots")
        .withIndex("by_saleId", (q) => q.eq("saleId", args.id))
        .collect(),
    ])

    await restoreSaleAllocations(
      ctx,
      pharmacy._id,
      existingItems as SaleItemRecord[],
      existingItemLots as SaleItemLotRecord[],
      {
        reason: "Annulation avant mise à jour de vente",
        sourceId: String(args.id),
        createdByClerkUserId: identity.subject,
      }
    )

    await ctx.db.patch(args.id, {
      clientId: args.clientId,
      paymentMethod: args.paymentMethod,
      globalDiscountType: args.globalDiscountType,
      globalDiscountValue: args.globalDiscountValue,
      totalAmountHt: args.totalAmountHt,
      totalAmountTtc: args.totalAmountTtc,
    })

    await Promise.all(existingItemLots.map((itemLot) => ctx.db.delete(itemLot._id)))
    await Promise.all(existingItems.map((item) => ctx.db.delete(item._id)))

    const createdItems = await Promise.all(
      args.items.map(async (item) => {
        const saleItemId = await ctx.db.insert("saleItems", {
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

        return {
          saleItemId,
          productId: item.productId,
          productNameSnapshot: item.productNameSnapshot,
          quantity: item.quantity,
        }
      })
    )

    await applyFefoDeductions(ctx, pharmacy._id, args.id, createdItems, {
      reason: "Mise à jour de vente",
      sourceId: String(args.id),
      createdByClerkUserId: identity.subject,
    })
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

    const [items, itemLots] = await Promise.all([
      ctx.db
        .query("saleItems")
        .withIndex("by_saleId", (q) => q.eq("saleId", args.id))
        .collect(),
      ctx.db
        .query("saleItemLots")
        .withIndex("by_saleId", (q) => q.eq("saleId", args.id))
        .collect(),
    ])

    await restoreSaleAllocations(
      ctx,
      pharmacy._id,
      items as SaleItemRecord[],
      itemLots as SaleItemLotRecord[],
      {
        reason: "Suppression de vente",
        sourceId: String(args.id),
        createdByClerkUserId: identity.subject,
      }
    )

    await Promise.all(itemLots.map((itemLot) => ctx.db.delete(itemLot._id)))
    await Promise.all(items.map((item) => ctx.db.delete(item._id)))
    await ctx.db.delete(args.id)
  },
})
