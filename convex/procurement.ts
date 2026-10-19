import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess, getAuthOrgId } from "./auth"
import type { Id } from "./_generated/dataModel"
import { recordStockMovement, type StockMovementType } from "./stockMovements"

const ORDER_PREFIXES = {
  PURCHASE_ORDER: "BC-",
  DELIVERY_NOTE: "BL-",
} as const

type ProcurementOrderType = "PURCHASE_ORDER" | "DELIVERY_NOTE"
type ProcurementStatus = "DRAFT" | "ORDERED" | "IN_PROGRESS" | "DELIVERED"
type ProcurementChannel = "EMAIL" | "PHONE"

const PURCHASE_ORDER_STATUSES = new Set<ProcurementStatus>(["DRAFT", "ORDERED"])
const DELIVERY_NOTE_STATUSES = new Set<ProcurementStatus>([
  "DRAFT",
  "ORDERED",
  "IN_PROGRESS",
  "DELIVERED",
])

type ProcurementOrderRecord = {
  _id: Id<"procurementOrders">
  pharmacyId: Id<"pharmacies">
  orderNumber?: string | null
  orderSequence?: number | null
  supplierId: Id<"suppliers">
  status: ProcurementStatus
  externalReference?: string | null
  channel?: ProcurementChannel | null
  orderDate: number
  dueDate?: number | null
  globalDiscountType?: "PERCENT" | "AMOUNT" | null
  globalDiscountValue?: number | null
  totalAmount: number
  createdAt: number
  type: ProcurementOrderType
}

type ProcurementItemRecord = {
  _id: Id<"procurementItems">
  orderId: Id<"procurementOrders">
  productId: Id<"products">
  quantity: number
  unitPrice: number
  lineDiscountType?: "PERCENT" | "AMOUNT" | null
  lineDiscountValue?: number | null
  lineTotal?: number | null
}

type ProcurementItemLotRecord = {
  _id: Id<"procurementItemLots">
  orderId: Id<"procurementOrders">
  procurementItemId: Id<"procurementItems">
  productId: Id<"products">
  lotNumber: string
  expiryDate: number
  quantity: number
  createdAt: number
}

type ProcurementMutationLotInput = {
  lotNumber: string
  expiryDate: number
  quantity: number
}

type NormalizedProcurementMutationLotInput = {
  lotNumber: string
  expiryDate: number
  quantity: number
}

function formatOrderNumber(prefix: string, sequence: number) {
  return `${prefix}${String(sequence).padStart(2, "0")}`
}

function parseOrderNumber(prefix: string, value?: string | null) {
  if (!value) return null
  const match = value.match(
    new RegExp(`^${prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}(\\d+)$`)
  )
  if (!match) return null
  return Number(match[1])
}

function buildFallbackNumbers(orders: ProcurementOrderRecord[], prefix: string) {
  const usedSequences = new Set<number>()
  orders.forEach((order) => {
    const sequence = order.orderSequence ?? parseOrderNumber(prefix, order.orderNumber) ?? 0
    if (sequence) {
      usedSequences.add(sequence)
    }
  })

  const fallbackNumbers = new Map<string, string>()
  const missing = orders
    .filter((order) => !order.orderNumber && !order.orderSequence)
    .sort((a, b) => a.createdAt - b.createdAt)

  let nextSequence = 1
  missing.forEach((order) => {
    while (usedSequences.has(nextSequence)) {
      nextSequence += 1
    }
    fallbackNumbers.set(String(order._id), formatOrderNumber(prefix, nextSequence))
    usedSequences.add(nextSequence)
    nextSequence += 1
  })

  return fallbackNumbers
}

const procurementStatusValidator = v.union(
  v.literal("DRAFT"),
  v.literal("ORDERED"),
  v.literal("IN_PROGRESS"),
  v.literal("DELIVERED")
)

type ProcurementMutationItemInput = {
  productId: Id<"products">
  quantity: number
  unitPrice: number
  lineDiscountType?: "PERCENT" | "AMOUNT"
  lineDiscountValue?: number
  lots?: ProcurementMutationLotInput[]
}

type ProcurementMutationArgs = {
  type: ProcurementOrderType
  supplierId: Id<"suppliers">
  status: ProcurementStatus
  channel?: ProcurementChannel
  orderDate: number
  dueDate?: number
  globalDiscountType?: "PERCENT" | "AMOUNT"
  globalDiscountValue?: number
  externalReference?: string
  items: ProcurementMutationItemInput[]
}

type NormalizedProcurementArgs = {
  supplierId: Id<"suppliers">
  status: ProcurementStatus
  channel?: ProcurementChannel
  orderDate: number
  dueDate?: number
  globalDiscountType?: "PERCENT" | "AMOUNT"
  globalDiscountValue?: number
  externalReference?: string
  items: Array<{
    productId: Id<"products">
    quantity: number
    unitPrice: number
    lineDiscountType?: "PERCENT" | "AMOUNT"
    lineDiscountValue?: number
    lots?: NormalizedProcurementMutationLotInput[]
  }>
}

function assertStatusAllowedForType(type: ProcurementOrderType, status: ProcurementStatus) {
  const allowedStatuses =
    type === "PURCHASE_ORDER" ? PURCHASE_ORDER_STATUSES : DELIVERY_NOTE_STATUSES
  if (!allowedStatuses.has(status)) {
    throw new Error("Invalid status for order type")
  }
}

function normalizeProcurementArgs(args: ProcurementMutationArgs): NormalizedProcurementArgs {
  if (args.type === "PURCHASE_ORDER") {
    return {
      supplierId: args.supplierId,
      status: args.status,
      channel: args.channel,
      orderDate: args.orderDate,
      dueDate: undefined,
      globalDiscountType: undefined,
      globalDiscountValue: 0,
      externalReference: undefined,
      items: args.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineDiscountType: undefined,
        lineDiscountValue: 0,
        lots: undefined,
      })),
    }
  }

  return {
    supplierId: args.supplierId,
    status: args.status,
    channel: args.channel,
    orderDate: args.orderDate,
    dueDate: args.dueDate,
    globalDiscountType: args.globalDiscountType,
    globalDiscountValue: args.globalDiscountValue,
    externalReference: args.externalReference,
    items: args.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscountType: item.lineDiscountType,
      lineDiscountValue: item.lineDiscountValue,
      lots: item.lots?.map((lot) => ({
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate,
        quantity: lot.quantity,
      })),
    })),
  }
}

function isStockApplied(type: ProcurementOrderType, status: ProcurementStatus) {
  return type === "DELIVERY_NOTE" && status === "DELIVERED"
}

function aggregateQuantitiesByProduct(
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

type LotAggregate = {
  productId: Id<"products">
  lotNumber: string
  expiryDate: number
  quantity: number
  sourceItemId?: Id<"procurementItems">
}

function normalizeLotNumber(value: string) {
  return value.trim().toLocaleUpperCase("fr")
}

function normalizeExpiryDate(value: number) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid lot expiry date")
  }
  parsed.setHours(0, 0, 0, 0)
  return parsed.getTime()
}

function getTodayStart() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

function normalizeAndValidateItemLots(
  item: {
    quantity: number
    lots?: NormalizedProcurementMutationLotInput[]
  },
  options: { requireLots: boolean }
) {
  const lots = item.lots ?? []
  if (lots.length === 0) {
    if (options.requireLots) {
      throw new Error("Lots are required when marking a delivery note as delivered")
    }
    return []
  }

  const seenLotNumbers = new Set<string>()
  const todayStart = getTodayStart()
  const normalizedLots = lots.map((lot) => {
    const lotNumber = normalizeLotNumber(lot.lotNumber)
    if (!lotNumber) {
      throw new Error("Lot number is required")
    }
    if (seenLotNumbers.has(lotNumber)) {
      throw new Error(`Duplicate lot number for line item: ${lotNumber}`)
    }
    seenLotNumbers.add(lotNumber)

    if (!Number.isFinite(lot.quantity) || lot.quantity <= 0) {
      throw new Error(`Invalid quantity for lot ${lotNumber}`)
    }

    const expiryDate = normalizeExpiryDate(lot.expiryDate)
    if (expiryDate < todayStart) {
      throw new Error(`Expiry date must be in the future for lot ${lotNumber}`)
    }

    return {
      lotNumber,
      expiryDate,
      quantity: lot.quantity,
    }
  })

  const totalLotQuantity = normalizedLots.reduce((sum, lot) => sum + lot.quantity, 0)
  if (Math.abs(totalLotQuantity - item.quantity) > 0.0001) {
    throw new Error("Lot quantities must match the line quantity")
  }

  return normalizedLots
}

function aggregateLotsByProductAndLot(lots: LotAggregate[]) {
  const aggregates = new Map<string, LotAggregate>()

  lots.forEach((lot) => {
    const key = `${String(lot.productId)}::${lot.lotNumber}`
    const existing = aggregates.get(key)
    if (!existing) {
      aggregates.set(key, { ...lot })
      return
    }
    if (existing.expiryDate !== lot.expiryDate) {
      throw new Error(`Duplicate lot collision for product lot ${lot.lotNumber}`)
    }
    existing.quantity += lot.quantity
    if (!existing.sourceItemId && lot.sourceItemId) {
      existing.sourceItemId = lot.sourceItemId
    }
  })

  return aggregates
}

async function applyLotDelta(
  ctx: MutationCtx,
  pharmacyId: Id<"pharmacies">,
  before: Map<string, LotAggregate>,
  after: Map<string, LotAggregate>,
  sourceOrderId: Id<"procurementOrders">
) {
  const lotKeys = new Set([...before.keys(), ...after.keys()])

  await Promise.all(
    Array.from(lotKeys).map(async (lotKey) => {
      const nextLot = after.get(lotKey)
      const previousLot = before.get(lotKey)
      const delta = (nextLot?.quantity ?? 0) - (previousLot?.quantity ?? 0)
      if (!delta) return

      const baseLot = nextLot ?? previousLot
      if (!baseLot) return

      const product = await ctx.db.get(baseLot.productId)
      if (!product || product.pharmacyId !== pharmacyId) {
        throw new Error("Unauthorized")
      }

      const existingLots = await ctx.db
        .query("stockLots")
        .withIndex("by_pharmacyId_productId_lotNumber", (q) =>
          q
            .eq("pharmacyId", pharmacyId)
            .eq("productId", baseLot.productId)
            .eq("lotNumber", baseLot.lotNumber)
        )
        .collect()

      const expiryMatch = existingLots.find((lot) => lot.expiryDate === baseLot.expiryDate)
      const hasCollision = existingLots.some((lot) => lot.expiryDate !== baseLot.expiryDate)
      if (hasCollision) {
        throw new Error(
          `Duplicate lot collision for ${product.name}: ${baseLot.lotNumber} has a different expiry date`
        )
      }

      if (!expiryMatch) {
        if (delta < 0) {
          throw new Error(`Lot underflow for ${product.name} (${baseLot.lotNumber})`)
        }
        const timestamp = Date.now()
        await ctx.db.insert("stockLots", {
          pharmacyId,
          productId: baseLot.productId,
          lotNumber: baseLot.lotNumber,
          expiryDate: baseLot.expiryDate,
          quantity: delta,
          sourceType: "DELIVERY_NOTE",
          sourceOrderId,
          sourceItemId: nextLot?.sourceItemId,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        return
      }

      const nextQuantity = expiryMatch.quantity + delta
      if (nextQuantity < 0) {
        throw new Error(`Lot underflow for ${product.name} (${baseLot.lotNumber})`)
      }
      await ctx.db.patch(expiryMatch._id, {
        quantity: nextQuantity,
        updatedAt: Date.now(),
      })
    })
  )
}

async function applyStockDelta(
  ctx: MutationCtx,
  pharmacyId: Id<"pharmacies">,
  before: Map<string, number>,
  after: Map<string, number>,
  movement: {
    movementType: StockMovementType
    reason: string
    sourceId: string
    createdByClerkUserId?: string
  }
) {
  const productKeys = new Set([...before.keys(), ...after.keys()])

  await Promise.all(
    Array.from(productKeys).map(async (productId) => {
      const delta = (after.get(productId) ?? 0) - (before.get(productId) ?? 0)
      if (!delta) return

      const product = await ctx.db.get(productId as Id<"products">)
      if (!product || product.pharmacyId !== pharmacyId) {
        throw new Error("Unauthorized")
      }

      await ctx.db.patch(product._id, {
        stockQuantity: product.stockQuantity + delta,
      })

      await recordStockMovement(ctx, {
        pharmacyId,
        productId: product._id,
        productNameSnapshot: product.name,
        delta,
        movementType: movement.movementType,
        reason: movement.reason,
        sourceId: movement.sourceId,
        createdByClerkUserId: movement.createdByClerkUserId,
      })
    })
  )
}

async function getNextOrderNumber(
  ctx: MutationCtx,
  pharmacyId: Id<"pharmacies">,
  type: ProcurementOrderType
) {
  const orderPrefix = ORDER_PREFIXES[type]
  const existingOrders = await ctx.db
    .query("procurementOrders")
    .withIndex("by_pharmacyId_type", (q) => q.eq("pharmacyId", pharmacyId).eq("type", type))
    .collect()

  const maxSequence = existingOrders.reduce((max, order) => {
    const sequence = order.orderSequence ?? parseOrderNumber(orderPrefix, order.orderNumber) ?? 0
    return Math.max(max, sequence)
  }, existingOrders.length)

  const orderSequence = maxSequence + 1
  const orderNumber = formatOrderNumber(orderPrefix, orderSequence)

  return { orderNumber, orderSequence }
}

function getDiscountAmount(subtotal: number, type?: "PERCENT" | "AMOUNT" | null, value?: number) {
  const discountValue = value ?? 0
  if (type === "AMOUNT") {
    return discountValue
  }
  return (subtotal * discountValue) / 100
}

function calculateLineTotal(item: {
  quantity: number
  unitPrice: number
  lineDiscountType?: "PERCENT" | "AMOUNT" | null
  lineDiscountValue?: number | null
}) {
  const subtotal = item.quantity * item.unitPrice
  const discount = getDiscountAmount(subtotal, item.lineDiscountType, item.lineDiscountValue ?? 0)
  return Math.max(0, subtotal - discount)
}

function calculateOrderTotal(
  items: Array<{
    quantity: number
    unitPrice: number
    lineDiscountType?: "PERCENT" | "AMOUNT" | null
    lineDiscountValue?: number | null
  }>,
  globalDiscountType?: "PERCENT" | "AMOUNT" | null,
  globalDiscountValue?: number | null
) {
  const subtotal = items.reduce((sum, item) => sum + calculateLineTotal(item), 0)
  const globalDiscount = getDiscountAmount(subtotal, globalDiscountType, globalDiscountValue ?? 0)
  return Math.max(0, subtotal - globalDiscount)
}

function buildLowStockSignature(
  products: Array<{ _id: Id<"products">; stockQuantity: number; lowStockThreshold: number }>
) {
  const lowStock = products.filter((product) => product.stockQuantity <= product.lowStockThreshold)
  if (lowStock.length === 0) return ""
  return lowStock
    .map((product) => String(product._id))
    .sort()
    .join("|")
}

type QueryOrMutationCtx = QueryCtx | MutationCtx

async function getLowStockSignature(ctx: QueryOrMutationCtx, pharmacyId: Id<"pharmacies">) {
  const products = (await ctx.db
    .query("products")
    .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacyId))
    .collect()) as Array<{
    _id: Id<"products">
    stockQuantity: number
    lowStockThreshold: number
  }>
  return buildLowStockSignature(products)
}

export const listByOrg = query({
  args: {
    clerkOrgId: v.string(),
    type: v.union(v.literal("PURCHASE_ORDER"), v.literal("DELIVERY_NOTE")),
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

    const orders = await ctx.db
      .query("procurementOrders")
      .withIndex("by_pharmacyId_type", (q) =>
        q.eq("pharmacyId", pharmacy._id).eq("type", args.type)
      )
      .collect()

    if (orders.length === 0) {
      return []
    }

    const [suppliers, items, products, itemLots] = await Promise.all([
      ctx.db
        .query("suppliers")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("procurementItems")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("products")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("procurementItemLots")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
    ])

    const suppliersById = new Map(suppliers.map((supplier) => [supplier._id, supplier]))
    const productsById = new Map(products.map((product) => [product._id, product]))
    const lotsByItemId = new Map<string, ProcurementItemLotRecord[]>()
    ;(itemLots as ProcurementItemLotRecord[]).forEach((lot) => {
      const key = String(lot.procurementItemId)
      const current = lotsByItemId.get(key) ?? []
      current.push(lot)
      lotsByItemId.set(key, current)
    })

    const itemsByOrder = new Map<string, typeof items>()
    items.forEach((item) => {
      const orderItems = itemsByOrder.get(item.orderId) ?? []
      orderItems.push(item)
      itemsByOrder.set(item.orderId, orderItems)
    })

    const missingItemOrders = orders.filter((order) => !itemsByOrder.has(order._id))
    if (missingItemOrders.length > 0) {
      const fallbackItems = await Promise.all(
        missingItemOrders.map(async (order) => ({
          orderId: order._id,
          items: await ctx.db
            .query("procurementItems")
            .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
            .collect(),
        }))
      )
      fallbackItems.forEach(({ orderId, items: orderItems }) => {
        if (orderItems.length === 0) {
          return
        }
        const existingItems = itemsByOrder.get(orderId) ?? []
        itemsByOrder.set(orderId, [...existingItems, ...orderItems])
      })
    }

    return orders.map((order) => {
      const supplier = suppliersById.get(order.supplierId)
      const mappedItems = (itemsByOrder.get(order._id) ?? []).map((item) => {
        const product = productsById.get(item.productId)
        const lots = (lotsByItemId.get(String(item._id)) ?? [])
          .map((lot) => ({
            lotNumber: lot.lotNumber,
            expiryDate: lot.expiryDate,
            quantity: lot.quantity,
          }))
          .sort((left, right) => left.expiryDate - right.expiryDate)
        return {
          id: item._id,
          productId: item.productId,
          productName: product?.name ?? "Produit inconnu",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: item.lineDiscountType ?? null,
          lineDiscountValue: item.lineDiscountValue ?? null,
          lineTotal: item.lineTotal ?? null,
          lots,
        }
      })

      return {
        id: order._id,
        orderNumber: order.orderNumber ?? null,
        orderSequence: order.orderSequence ?? null,
        supplierId: order.supplierId,
        supplierName: supplier?.name ?? "Fournisseur inconnu",
        channel: order.channel ?? null,
        createdAt: order.createdAt,
        orderDate: order.orderDate,
        dueDate: order.dueDate ?? null,
        totalAmount: order.totalAmount,
        status: order.status,
        type: order.type,
        externalReference: order.externalReference ?? null,
        globalDiscountType: order.globalDiscountType ?? null,
        globalDiscountValue: order.globalDiscountValue ?? null,
        items: mappedItems,
      }
    })
  },
})

const procurementItemValidator = v.object({
  id: v.id("procurementItems"),
  productId: v.id("products"),
  productName: v.string(),
  quantity: v.number(),
  unitPrice: v.number(),
  lineDiscountType: v.union(v.literal("PERCENT"), v.literal("AMOUNT"), v.null()),
  lineDiscountValue: v.union(v.number(), v.null()),
  lineTotal: v.union(v.number(), v.null()),
  lots: v.array(
    v.object({
      lotNumber: v.string(),
      expiryDate: v.number(),
      quantity: v.number(),
    })
  ),
})

const procurementOrderValidator = v.object({
  id: v.id("procurementOrders"),
  orderNumber: v.union(v.string(), v.null()),
  orderSequence: v.union(v.number(), v.null()),
  supplierId: v.id("suppliers"),
  supplierName: v.string(),
  channel: v.union(v.literal("EMAIL"), v.literal("PHONE"), v.null()),
  createdAt: v.number(),
  orderDate: v.number(),
  dueDate: v.union(v.number(), v.null()),
  totalAmount: v.number(),
  status: procurementStatusValidator,
  type: v.union(v.literal("PURCHASE_ORDER"), v.literal("DELIVERY_NOTE")),
  externalReference: v.union(v.string(), v.null()),
  globalDiscountType: v.union(v.literal("PERCENT"), v.literal("AMOUNT"), v.null()),
  globalDiscountValue: v.union(v.number(), v.null()),
  items: v.array(procurementItemValidator),
})

export const getById = query({
  args: {
    clerkOrgId: v.string(),
    id: v.id("procurementOrders"),
  },
  returns: v.union(procurementOrderValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const orgId = getAuthOrgId(identity)
    if (!orgId || orgId !== args.clerkOrgId) {
      return null
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      return null
    }

    const order = (await ctx.db.get(args.id)) as ProcurementOrderRecord | null
    if (!order || order.pharmacyId !== pharmacy._id) {
      return null
    }

    const [supplier, items, products, itemLots] = await Promise.all([
      ctx.db.get(order.supplierId),
      ctx.db
        .query("procurementItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect(),
      ctx.db
        .query("products")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("procurementItemLots")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect(),
    ])

    const productsById = new Map(products.map((product) => [product._id, product]))
    const lotsByItemId = new Map<string, ProcurementItemLotRecord[]>()
    ;(itemLots as ProcurementItemLotRecord[]).forEach((lot) => {
      const key = String(lot.procurementItemId)
      const current = lotsByItemId.get(key) ?? []
      current.push(lot)
      lotsByItemId.set(key, current)
    })

    const mappedItems = items.map((item) => {
      const product = productsById.get(item.productId)
      const lots = (lotsByItemId.get(String(item._id)) ?? [])
        .map((lot) => ({
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate,
          quantity: lot.quantity,
        }))
        .sort((left, right) => left.expiryDate - right.expiryDate)
      return {
        id: item._id,
        productId: item.productId,
        productName: product?.name ?? "Produit inconnu",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineDiscountType: item.lineDiscountType ?? null,
        lineDiscountValue: item.lineDiscountValue ?? null,
        lineTotal: item.lineTotal ?? null,
        lots,
      }
    })

    return {
      id: order._id,
      orderNumber: order.orderNumber ?? null,
      orderSequence: order.orderSequence ?? null,
      supplierId: order.supplierId,
      supplierName: supplier?.name ?? "Fournisseur inconnu",
      channel: order.channel ?? null,
      createdAt: order.createdAt,
      orderDate: order.orderDate,
      dueDate: order.dueDate ?? null,
      totalAmount: order.totalAmount,
      status: order.status,
      type: order.type,
      externalReference: order.externalReference ?? null,
      globalDiscountType: order.globalDiscountType ?? null,
      globalDiscountValue: order.globalDiscountValue ?? null,
      items: mappedItems,
    }
  },
})

export const listByOrgPaginated = query({
  args: {
    clerkOrgId: v.string(),
    type: v.union(v.literal("PURCHASE_ORDER"), v.literal("DELIVERY_NOTE")),
    pagination: v.object({
      page: v.number(),
      pageSize: v.number(),
    }),
    filters: v.optional(
      v.object({
        supplierNames: v.optional(v.array(v.string())),
        statuses: v.optional(v.array(procurementStatusValidator)),
        references: v.optional(v.array(v.string())),
        orderFrom: v.optional(v.number()),
        orderTo: v.optional(v.number()),
        dueFrom: v.optional(v.number()),
        dueTo: v.optional(v.number()),
        createdFrom: v.optional(v.number()),
        createdTo: v.optional(v.number()),
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
        filterOptions: { suppliers: [], references: [] },
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
        filterOptions: { suppliers: [], references: [] },
        fallbackNumbers: {},
      }
    }

    const orders = (await ctx.db
      .query("procurementOrders")
      .withIndex("by_pharmacyId_type", (q) =>
        q.eq("pharmacyId", pharmacy._id).eq("type", args.type)
      )
      .collect()) as ProcurementOrderRecord[]

    if (orders.length === 0) {
      return {
        items: [],
        totalCount: 0,
        filterOptions: { suppliers: [], references: [] },
        fallbackNumbers: {},
      }
    }

    const [suppliers, items, products, itemLots] = await Promise.all([
      ctx.db
        .query("suppliers")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("procurementItems")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("products")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("procurementItemLots")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
    ])

    const suppliersById = new Map(suppliers.map((supplier) => [String(supplier._id), supplier]))
    const productsById = new Map(products.map((product) => [String(product._id), product]))
    const lotsByItemId = new Map<string, ProcurementItemLotRecord[]>()
    ;(itemLots as ProcurementItemLotRecord[]).forEach((lot) => {
      const key = String(lot.procurementItemId)
      const current = lotsByItemId.get(key) ?? []
      current.push(lot)
      lotsByItemId.set(key, current)
    })

    const itemsByOrder = new Map<string, ProcurementItemRecord[]>()
    ;(items as ProcurementItemRecord[]).forEach((item) => {
      const orderItems = itemsByOrder.get(String(item.orderId)) ?? []
      orderItems.push(item)
      itemsByOrder.set(String(item.orderId), orderItems)
    })

    const missingItemOrders = orders.filter((order) => !itemsByOrder.has(String(order._id)))
    if (missingItemOrders.length > 0) {
      const fallbackItems = await Promise.all(
        missingItemOrders.map(async (order) => ({
          orderId: String(order._id),
          items: await ctx.db
            .query("procurementItems")
            .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
            .collect(),
        }))
      )
      fallbackItems.forEach(({ orderId, items: orderItems }) => {
        if (orderItems.length === 0) {
          return
        }
        const existingItems = itemsByOrder.get(orderId) ?? []
        itemsByOrder.set(orderId, [...existingItems, ...(orderItems as ProcurementItemRecord[])])
      })
    }

    const mappedOrders = orders.map((order) => {
      const supplier = suppliersById.get(String(order.supplierId))
      const mappedItems = (itemsByOrder.get(String(order._id)) ?? []).map((item) => {
        const product = productsById.get(String(item.productId))
        const lots = (lotsByItemId.get(String(item._id)) ?? [])
          .map((lot) => ({
            lotNumber: lot.lotNumber,
            expiryDate: lot.expiryDate,
            quantity: lot.quantity,
          }))
          .sort((left, right) => left.expiryDate - right.expiryDate)
        return {
          id: item._id,
          productId: item.productId,
          productName: product?.name ?? "Produit inconnu",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: item.lineDiscountType ?? null,
          lineDiscountValue: item.lineDiscountValue ?? null,
          lineTotal: item.lineTotal ?? null,
          lots,
        }
      })

      return {
        id: order._id,
        orderNumber: order.orderNumber ?? null,
        orderSequence: order.orderSequence ?? null,
        supplierId: order.supplierId,
        supplierName: supplier?.name ?? "Fournisseur inconnu",
        channel: order.channel ?? null,
        createdAt: order.createdAt,
        orderDate: order.orderDate,
        dueDate: order.dueDate ?? null,
        totalAmount: order.totalAmount,
        status: order.status,
        type: order.type,
        externalReference: order.externalReference ?? null,
        globalDiscountType: order.globalDiscountType ?? null,
        globalDiscountValue: order.globalDiscountValue ?? null,
        items: mappedItems,
      }
    })

    const supplierOptions = Array.from(new Set(mappedOrders.map((order) => order.supplierName)))
    const referenceOptions = Array.from(
      new Set(mappedOrders.map((order) => order.externalReference ?? "-"))
    )

    const supplierFilter = new Set(args.filters?.supplierNames ?? [])
    const statusFilter = new Set(args.filters?.statuses ?? [])
    const referenceFilter = new Set(args.filters?.references ?? [])
    const orderFrom = args.filters?.orderFrom
    const orderTo = args.filters?.orderTo
    const dueFrom = args.filters?.dueFrom
    const dueTo = args.filters?.dueTo
    const createdFrom = args.filters?.createdFrom
    const createdTo = args.filters?.createdTo

    const filtered = mappedOrders.filter((order) => {
      if (supplierFilter.size > 0 && !supplierFilter.has(order.supplierName)) {
        return false
      }
      if (statusFilter.size > 0 && !statusFilter.has(order.status)) {
        return false
      }
      const reference = order.externalReference ?? "-"
      if (referenceFilter.size > 0 && !referenceFilter.has(reference)) {
        return false
      }
      if (typeof orderFrom === "number" && order.orderDate < orderFrom) {
        return false
      }
      if (typeof orderTo === "number" && order.orderDate > orderTo) {
        return false
      }
      if (typeof dueFrom === "number") {
        if (!order.dueDate || order.dueDate < dueFrom) {
          return false
        }
      }
      if (typeof dueTo === "number") {
        if (!order.dueDate || order.dueDate > dueTo) {
          return false
        }
      }
      if (typeof createdFrom === "number" && order.createdAt < createdFrom) {
        return false
      }
      if (typeof createdTo === "number" && order.createdAt > createdTo) {
        return false
      }
      return true
    })

    const totalCount = filtered.length
    const start = (args.pagination.page - 1) * args.pagination.pageSize
    const itemsPage = filtered.slice(start, start + args.pagination.pageSize)

    const orderPrefix = ORDER_PREFIXES[args.type]
    const fallbackNumbers = buildFallbackNumbers(orders, orderPrefix)
    const pagedFallbackNumbers: Record<string, string> = {}
    itemsPage.forEach((order) => {
      const fallback = fallbackNumbers.get(String(order.id))
      if (fallback) {
        pagedFallbackNumbers[String(order.id)] = fallback
      }
    })

    return {
      items: itemsPage,
      totalCount,
      filterOptions: { suppliers: supplierOptions, references: referenceOptions },
      fallbackNumbers: pagedFallbackNumbers,
    }
  },
})

export const create = mutation({
  args: {
    clerkOrgId: v.string(),
    type: v.union(v.literal("PURCHASE_ORDER"), v.literal("DELIVERY_NOTE")),
    supplierId: v.id("suppliers"),
    status: procurementStatusValidator,
    channel: v.optional(v.union(v.literal("EMAIL"), v.literal("PHONE"))),
    orderDate: v.number(),
    dueDate: v.optional(v.number()),
    globalDiscountType: v.optional(v.union(v.literal("PERCENT"), v.literal("AMOUNT"))),
    globalDiscountValue: v.optional(v.number()),
    totalAmount: v.number(),
    externalReference: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        unitPrice: v.number(),
        lineDiscountType: v.optional(v.union(v.literal("PERCENT"), v.literal("AMOUNT"))),
        lineDiscountValue: v.optional(v.number()),
        lots: v.optional(
          v.array(
            v.object({
              lotNumber: v.string(),
              expiryDate: v.number(),
              quantity: v.number(),
            })
          )
        ),
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

    const supplier = await ctx.db.get(args.supplierId)
    if (!supplier || supplier.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    assertStatusAllowedForType(args.type, args.status)

    const uniqueProductIds = Array.from(new Set(args.items.map((item) => String(item.productId))))
    const products = await Promise.all(
      uniqueProductIds.map((productId) => ctx.db.get(productId as Id<"products">))
    )
    if (products.some((product) => !product || product.pharmacyId !== pharmacy._id)) {
      throw new Error("Unauthorized")
    }

    const { orderNumber, orderSequence } = await getNextOrderNumber(ctx, pharmacy._id, args.type)
    const normalizedArgs = normalizeProcurementArgs(args)
    const requiresLots = isStockApplied(args.type, normalizedArgs.status)
    const normalizedLotsByItem = normalizedArgs.items.map((item) =>
      normalizeAndValidateItemLots(item, { requireLots: requiresLots })
    )

    const totalAmount = calculateOrderTotal(
      normalizedArgs.items,
      normalizedArgs.globalDiscountType,
      normalizedArgs.globalDiscountValue
    )

    const orderId = await ctx.db.insert("procurementOrders", {
      pharmacyId: pharmacy._id,
      orderNumber,
      orderSequence,
      type: args.type,
      supplierId: args.supplierId,
      status: normalizedArgs.status,
      externalReference: normalizedArgs.externalReference,
      channel: normalizedArgs.channel,
      orderDate: normalizedArgs.orderDate,
      dueDate: normalizedArgs.dueDate,
      globalDiscountType: normalizedArgs.globalDiscountType,
      globalDiscountValue: normalizedArgs.globalDiscountValue,
      totalAmount,
      createdAt: Date.now(),
    })

    const createdItems = await Promise.all(
      normalizedArgs.items.map(async (item, index) => {
        const procurementItemId = await ctx.db.insert("procurementItems", {
          pharmacyId: pharmacy._id,
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: item.lineDiscountType,
          lineDiscountValue: item.lineDiscountValue,
          lineTotal: calculateLineTotal(item),
        })
        const lots = normalizedLotsByItem[index] ?? []

        if (lots.length > 0) {
          await Promise.all(
            lots.map((lot) =>
              ctx.db.insert("procurementItemLots", {
                pharmacyId: pharmacy._id,
                orderId,
                procurementItemId,
                productId: item.productId,
                lotNumber: lot.lotNumber,
                expiryDate: lot.expiryDate,
                quantity: lot.quantity,
                createdAt: Date.now(),
              })
            )
          )
        }

        return {
          procurementItemId,
          productId: item.productId,
          lots,
        }
      })
    )

    if (requiresLots) {
      const afterLotQuantities = aggregateLotsByProductAndLot(
        createdItems.flatMap((item) =>
          item.lots.map((lot) => ({
            productId: item.productId,
            lotNumber: lot.lotNumber,
            expiryDate: lot.expiryDate,
            quantity: lot.quantity,
            sourceItemId: item.procurementItemId,
          }))
        )
      )

      await applyStockDelta(
        ctx,
        pharmacy._id,
        new Map<string, number>(),
        aggregateQuantitiesByProduct(normalizedArgs.items),
        {
          movementType: "DELIVERY_NOTE_STOCK_SYNC",
          reason: "Bon de livraison marqué livré",
          sourceId: String(orderId),
          createdByClerkUserId: identity.subject,
        }
      )

      await applyLotDelta(
        ctx,
        pharmacy._id,
        new Map<string, LotAggregate>(),
        afterLotQuantities,
        orderId
      )
    }

    return orderId
  },
})

export const update = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("procurementOrders"),
    supplierId: v.id("suppliers"),
    status: procurementStatusValidator,
    channel: v.optional(v.union(v.literal("EMAIL"), v.literal("PHONE"))),
    orderDate: v.number(),
    dueDate: v.optional(v.number()),
    globalDiscountType: v.optional(v.union(v.literal("PERCENT"), v.literal("AMOUNT"))),
    globalDiscountValue: v.optional(v.number()),
    totalAmount: v.number(),
    externalReference: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        unitPrice: v.number(),
        lineDiscountType: v.optional(v.union(v.literal("PERCENT"), v.literal("AMOUNT"))),
        lineDiscountValue: v.optional(v.number()),
        lots: v.optional(
          v.array(
            v.object({
              lotNumber: v.string(),
              expiryDate: v.number(),
              quantity: v.number(),
            })
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const order = (await ctx.db.get(args.id)) as ProcurementOrderRecord | null
    if (!order) {
      throw new Error("Order not found")
    }
    if (order.type === "DELIVERY_NOTE" && order.status === "DELIVERED") {
      throw new Error("Delivered delivery notes cannot be edited")
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy || order.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    const supplier = await ctx.db.get(args.supplierId)
    if (!supplier || supplier.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    assertStatusAllowedForType(order.type, args.status)

    const uniqueProductIds = Array.from(new Set(args.items.map((item) => String(item.productId))))
    const products = await Promise.all(
      uniqueProductIds.map((productId) => ctx.db.get(productId as Id<"products">))
    )
    if (products.some((product) => !product || product.pharmacyId !== pharmacy._id)) {
      throw new Error("Unauthorized")
    }

    const normalizedArgs = normalizeProcurementArgs({
      type: order.type,
      supplierId: args.supplierId,
      status: args.status,
      channel: args.channel,
      orderDate: args.orderDate,
      dueDate: args.dueDate,
      globalDiscountType: args.globalDiscountType,
      globalDiscountValue: args.globalDiscountValue,
      externalReference: args.externalReference,
      items: args.items,
    })
    const requiresLots = isStockApplied(order.type, normalizedArgs.status)
    const normalizedLotsByItem = normalizedArgs.items.map((item) =>
      normalizeAndValidateItemLots(item, { requireLots: requiresLots })
    )

    const [existingItems, existingItemLots] = await Promise.all([
      ctx.db
        .query("procurementItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
        .collect(),
      ctx.db
        .query("procurementItemLots")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
        .collect(),
    ])

    const beforeStockQuantities = isStockApplied(order.type, order.status)
      ? aggregateQuantitiesByProduct(existingItems)
      : new Map<string, number>()
    const beforeLotQuantities = isStockApplied(order.type, order.status)
      ? aggregateLotsByProductAndLot(
          (existingItemLots as ProcurementItemLotRecord[]).map((lot) => ({
            productId: lot.productId,
            lotNumber: lot.lotNumber,
            expiryDate: lot.expiryDate,
            quantity: lot.quantity,
            sourceItemId: lot.procurementItemId,
          }))
        )
      : new Map<string, LotAggregate>()
    const afterStockQuantities = isStockApplied(order.type, normalizedArgs.status)
      ? aggregateQuantitiesByProduct(normalizedArgs.items)
      : new Map<string, number>()

    const totalAmount = calculateOrderTotal(
      normalizedArgs.items,
      normalizedArgs.globalDiscountType,
      normalizedArgs.globalDiscountValue
    )

    await ctx.db.patch(args.id, {
      supplierId: normalizedArgs.supplierId,
      status: normalizedArgs.status,
      externalReference: normalizedArgs.externalReference,
      channel: normalizedArgs.channel,
      orderDate: normalizedArgs.orderDate,
      dueDate: normalizedArgs.dueDate,
      globalDiscountType: normalizedArgs.globalDiscountType,
      globalDiscountValue: normalizedArgs.globalDiscountValue,
      totalAmount,
    })

    await Promise.all(existingItemLots.map((lot) => ctx.db.delete(lot._id)))
    await Promise.all(existingItems.map((item) => ctx.db.delete(item._id)))

    const createdItems = await Promise.all(
      normalizedArgs.items.map(async (item, index) => {
        const procurementItemId = await ctx.db.insert("procurementItems", {
          pharmacyId: pharmacy._id,
          orderId: args.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: item.lineDiscountType,
          lineDiscountValue: item.lineDiscountValue,
          lineTotal: calculateLineTotal(item),
        })
        const lots = normalizedLotsByItem[index] ?? []

        if (lots.length > 0) {
          await Promise.all(
            lots.map((lot) =>
              ctx.db.insert("procurementItemLots", {
                pharmacyId: pharmacy._id,
                orderId: args.id,
                procurementItemId,
                productId: item.productId,
                lotNumber: lot.lotNumber,
                expiryDate: lot.expiryDate,
                quantity: lot.quantity,
                createdAt: Date.now(),
              })
            )
          )
        }

        return {
          procurementItemId,
          productId: item.productId,
          lots,
        }
      })
    )
    const afterLotQuantities = isStockApplied(order.type, normalizedArgs.status)
      ? aggregateLotsByProductAndLot(
          createdItems.flatMap((item) =>
            item.lots.map((lot) => ({
              productId: item.productId,
              lotNumber: lot.lotNumber,
              expiryDate: lot.expiryDate,
              quantity: lot.quantity,
              sourceItemId: item.procurementItemId,
            }))
          )
        )
      : new Map<string, LotAggregate>()

    await applyStockDelta(ctx, pharmacy._id, beforeStockQuantities, afterStockQuantities, {
      movementType: "DELIVERY_NOTE_STOCK_SYNC",
      reason: "Mise à jour du bon de livraison",
      sourceId: String(args.id),
      createdByClerkUserId: identity.subject,
    })
    await applyLotDelta(ctx, pharmacy._id, beforeLotQuantities, afterLotQuantities, args.id)

    const shouldHandleAlert =
      pharmacy.lowStockAlertOrderId === order._id &&
      (normalizedArgs.status === "ORDERED" || normalizedArgs.status === "DELIVERED")

    if (shouldHandleAlert) {
      const signature = await getLowStockSignature(ctx, pharmacy._id)
      await ctx.db.patch(pharmacy._id, {
        lowStockAlertOrderId: undefined,
        lowStockAlertSignature: undefined,
        lowStockAlertHandledSignature: signature.length > 0 ? signature : undefined,
      })
    }
  },
})

export const createDeliveryFromPurchase = mutation({
  args: {
    clerkOrgId: v.string(),
    purchaseOrderId: v.id("procurementOrders"),
  },
  returns: v.id("procurementOrders"),
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

    const purchaseOrder = (await ctx.db.get(args.purchaseOrderId)) as ProcurementOrderRecord | null
    if (!purchaseOrder || purchaseOrder.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }
    if (purchaseOrder.type !== "PURCHASE_ORDER") {
      throw new Error("Order is not a purchase order")
    }
    if (purchaseOrder.status !== "ORDERED") {
      throw new Error("Only ordered purchase orders can create delivery notes")
    }

    const supplier = await ctx.db.get(purchaseOrder.supplierId)
    if (!supplier || supplier.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    const purchaseItems = (await ctx.db
      .query("procurementItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", purchaseOrder._id))
      .collect()) as ProcurementItemRecord[]

    if (purchaseItems.length === 0) {
      throw new Error("Purchase order has no items")
    }

    const { orderNumber, orderSequence } = await getNextOrderNumber(
      ctx,
      pharmacy._id,
      "DELIVERY_NOTE"
    )

    const items = purchaseItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscountType: undefined,
      lineDiscountValue: 0,
    }))

    const totalAmount = calculateOrderTotal(items, undefined, 0)

    const deliveryNoteId = await ctx.db.insert("procurementOrders", {
      pharmacyId: pharmacy._id,
      orderNumber,
      orderSequence,
      type: "DELIVERY_NOTE",
      supplierId: purchaseOrder.supplierId,
      status: "DRAFT",
      externalReference: undefined,
      channel: purchaseOrder.channel ?? undefined,
      orderDate: Date.now(),
      dueDate: undefined,
      globalDiscountType: undefined,
      globalDiscountValue: 0,
      totalAmount,
      createdAt: Date.now(),
    })

    await Promise.all(
      items.map((item) =>
        ctx.db.insert("procurementItems", {
          pharmacyId: pharmacy._id,
          orderId: deliveryNoteId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: item.lineDiscountType,
          lineDiscountValue: item.lineDiscountValue,
          lineTotal: calculateLineTotal(item),
        })
      )
    )

    return deliveryNoteId
  },
})

export const remove = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("procurementOrders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const order = await ctx.db.get(args.id)
    if (!order) {
      return
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy || order.pharmacyId !== pharmacy._id) {
      throw new Error("Unauthorized")
    }

    const [items, itemLots] = await Promise.all([
      ctx.db
        .query("procurementItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
        .collect(),
      ctx.db
        .query("procurementItemLots")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
        .collect(),
    ])

    await Promise.all(itemLots.map((lot) => ctx.db.delete(lot._id)))
    await Promise.all(items.map((item) => ctx.db.delete(item._id)))
    await ctx.db.delete(args.id)

    if (pharmacy.lowStockAlertOrderId === order._id) {
      await ctx.db.patch(pharmacy._id, {
        lowStockAlertOrderId: undefined,
        lowStockAlertSignature: undefined,
        lowStockAlertHandledSignature: undefined,
      })
    }
  },
})
