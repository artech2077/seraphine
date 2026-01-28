import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess, getAuthOrgId } from "./auth"
import type { Id } from "./_generated/dataModel"

const ORDER_PREFIXES = {
  PURCHASE_ORDER: "BC-",
  DELIVERY_NOTE: "BL-",
} as const

type ProcurementOrderRecord = {
  _id: Id<"procurementOrders">
  orderNumber?: string | null
  orderSequence?: number | null
  supplierId: Id<"suppliers">
  status: "DRAFT" | "ORDERED" | "DELIVERED"
  externalReference?: string | null
  channel?: "EMAIL" | "PHONE" | null
  orderDate: number
  dueDate?: number | null
  globalDiscountType?: "PERCENT" | "AMOUNT" | null
  globalDiscountValue?: number | null
  totalAmount: number
  createdAt: number
  type: "PURCHASE_ORDER" | "DELIVERY_NOTE"
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

    const [suppliers, items, products] = await Promise.all([
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
    ])

    const suppliersById = new Map(suppliers.map((supplier) => [supplier._id, supplier]))
    const productsById = new Map(products.map((product) => [product._id, product]))

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
        return {
          id: item._id,
          productName: product?.name ?? "Produit inconnu",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: item.lineDiscountType ?? null,
          lineDiscountValue: item.lineDiscountValue ?? null,
          lineTotal: item.lineTotal ?? null,
        }
      })

      return {
        id: order._id,
        orderNumber: order.orderNumber ?? null,
        orderSequence: order.orderSequence ?? null,
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
        statuses: v.optional(
          v.array(v.union(v.literal("DRAFT"), v.literal("ORDERED"), v.literal("DELIVERED")))
        ),
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

    const [suppliers, items, products] = await Promise.all([
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
    ])

    const suppliersById = new Map(suppliers.map((supplier) => [String(supplier._id), supplier]))
    const productsById = new Map(products.map((product) => [String(product._id), product]))

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
        return {
          id: item._id,
          productName: product?.name ?? "Produit inconnu",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: item.lineDiscountType ?? null,
          lineDiscountValue: item.lineDiscountValue ?? null,
          lineTotal: item.lineTotal ?? null,
        }
      })

      return {
        id: order._id,
        orderNumber: order.orderNumber ?? null,
        orderSequence: order.orderSequence ?? null,
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
    status: v.union(v.literal("DRAFT"), v.literal("ORDERED"), v.literal("DELIVERED")),
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

    const orderPrefix = ORDER_PREFIXES[args.type]
    const existingOrders = await ctx.db
      .query("procurementOrders")
      .withIndex("by_pharmacyId_type", (q) =>
        q.eq("pharmacyId", pharmacy._id).eq("type", args.type)
      )
      .collect()

    const maxSequence = existingOrders.reduce((max, order) => {
      const sequence = order.orderSequence ?? parseOrderNumber(orderPrefix, order.orderNumber) ?? 0
      return Math.max(max, sequence)
    }, existingOrders.length)
    const orderSequence = maxSequence + 1
    const orderNumber = formatOrderNumber(orderPrefix, orderSequence)

    const totalAmount = calculateOrderTotal(
      args.items,
      args.globalDiscountType,
      args.globalDiscountValue
    )

    const orderId = await ctx.db.insert("procurementOrders", {
      pharmacyId: pharmacy._id,
      orderNumber,
      orderSequence,
      type: args.type,
      supplierId: args.supplierId,
      status: args.status,
      externalReference: args.externalReference,
      channel: args.channel,
      orderDate: args.orderDate,
      dueDate: args.dueDate,
      globalDiscountType: args.globalDiscountType,
      globalDiscountValue: args.globalDiscountValue,
      totalAmount,
      createdAt: Date.now(),
    })

    await Promise.all(
      args.items.map((item) =>
        ctx.db.insert("procurementItems", {
          pharmacyId: pharmacy._id,
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: item.lineDiscountType,
          lineDiscountValue: item.lineDiscountValue,
          lineTotal: calculateLineTotal(item),
        })
      )
    )

    return orderId
  },
})

export const update = mutation({
  args: {
    clerkOrgId: v.string(),
    id: v.id("procurementOrders"),
    supplierId: v.id("suppliers"),
    status: v.union(v.literal("DRAFT"), v.literal("ORDERED"), v.literal("DELIVERED")),
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
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const order = await ctx.db.get(args.id)
    if (!order) {
      throw new Error("Order not found")
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

    const totalAmount = calculateOrderTotal(
      args.items,
      args.globalDiscountType,
      args.globalDiscountValue
    )

    await ctx.db.patch(args.id, {
      supplierId: args.supplierId,
      status: args.status,
      externalReference: args.externalReference,
      channel: args.channel,
      orderDate: args.orderDate,
      dueDate: args.dueDate,
      globalDiscountType: args.globalDiscountType,
      globalDiscountValue: args.globalDiscountValue,
      totalAmount,
    })

    const existingItems = await ctx.db
      .query("procurementItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect()

    await Promise.all(existingItems.map((item) => ctx.db.delete(item._id)))

    await Promise.all(
      args.items.map((item) =>
        ctx.db.insert("procurementItems", {
          pharmacyId: pharmacy._id,
          orderId: args.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: item.lineDiscountType,
          lineDiscountValue: item.lineDiscountValue,
          lineTotal: calculateLineTotal(item),
        })
      )
    )
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

    const items = await ctx.db
      .query("procurementItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect()

    await Promise.all(items.map((item) => ctx.db.delete(item._id)))
    await ctx.db.delete(args.id)
  },
})
