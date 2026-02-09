import { ConvexError, v } from "convex/values"

import { assertOrgAccess, getAuthOrgId } from "./auth"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"

type PharmacyRecord = Doc<"pharmacies">

type ProductRecord = Doc<"products">

type ProcurementOrderRecord = Doc<"procurementOrders">

type LowStockSummary = {
  count: number
  signature: string
  hasActiveDraft: boolean
  activeOrderId?: Id<"procurementOrders">
  lastSyncedSignature?: string
  isHandled: boolean
}

const lowStockSummaryValidator = v.object({
  count: v.number(),
  signature: v.string(),
  hasActiveDraft: v.boolean(),
  activeOrderId: v.optional(v.id("procurementOrders")),
  lastSyncedSignature: v.optional(v.string()),
  isHandled: v.boolean(),
})

function buildLowStockSignature(products: ProductRecord[]) {
  if (products.length === 0) return ""
  return products
    .map((product) => String(product._id))
    .sort()
    .join("|")
}

function calculateTotal(items: Array<{ quantity: number; unitPrice: number }>) {
  return items.reduce((sum, item) => sum + Math.max(0, item.quantity * item.unitPrice), 0)
}

function parseOrderNumber(value?: string | null) {
  if (!value) return null
  const match = value.match(/^BC-(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

type QueryOrMutationCtx = QueryCtx | MutationCtx

async function getPharmacy(ctx: QueryOrMutationCtx, clerkOrgId: string) {
  return (await ctx.db
    .query("pharmacies")
    .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
    .unique()) as PharmacyRecord | null
}

async function getLowStockProducts(ctx: QueryOrMutationCtx, pharmacyId: Id<"pharmacies">) {
  const products = (await ctx.db
    .query("products")
    .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacyId))
    .collect()) as ProductRecord[]

  return products.filter((product) => product.stockQuantity <= product.lowStockThreshold)
}

export const lowStockSummary = query({
  args: {
    clerkOrgId: v.string(),
  },
  returns: v.union(lowStockSummaryValidator, v.null()),
  handler: async (ctx, args): Promise<LowStockSummary | null> => {
    const identity = await ctx.auth.getUserIdentity()
    const orgId = getAuthOrgId(identity)
    if (!orgId || orgId !== args.clerkOrgId) {
      return null
    }

    const pharmacy = await getPharmacy(ctx, args.clerkOrgId)
    if (!pharmacy) {
      return null
    }

    const lowStockProducts = await getLowStockProducts(ctx, pharmacy._id)
    const signature = buildLowStockSignature(lowStockProducts)

    let hasActiveDraft = false
    let activeOrderId: Id<"procurementOrders"> | undefined
    if (pharmacy.lowStockAlertOrderId) {
      const order = (await ctx.db.get(
        pharmacy.lowStockAlertOrderId
      )) as ProcurementOrderRecord | null
      if (
        order &&
        order.pharmacyId === pharmacy._id &&
        order.status === "DRAFT" &&
        order.type === "PURCHASE_ORDER"
      ) {
        hasActiveDraft = true
        activeOrderId = order._id
      }
    }

    const isHandled =
      !hasActiveDraft &&
      signature.length > 0 &&
      pharmacy.lowStockAlertHandledSignature === signature

    return {
      count: lowStockProducts.length,
      signature,
      hasActiveDraft,
      activeOrderId,
      lastSyncedSignature: pharmacy.lowStockAlertSignature,
      isHandled,
    }
  },
})

export const createLowStockDraft = mutation({
  args: {
    clerkOrgId: v.string(),
    supplierId: v.id("suppliers"),
  },
  returns: v.id("procurementOrders"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const pharmacy = await getPharmacy(ctx, args.clerkOrgId)
    if (!pharmacy) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Pharmacy not found",
      })
    }

    const supplier = await ctx.db.get(args.supplierId)
    if (!supplier || supplier.pharmacyId !== pharmacy._id) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      })
    }

    const lowStockProducts = await getLowStockProducts(ctx, pharmacy._id)
    if (lowStockProducts.length === 0) {
      throw new ConvexError({
        code: "NO_LOW_STOCK",
        message: "No low stock products",
      })
    }

    const signature = buildLowStockSignature(lowStockProducts)

    if (pharmacy.lowStockAlertOrderId) {
      const existingOrder = (await ctx.db.get(
        pharmacy.lowStockAlertOrderId
      )) as ProcurementOrderRecord | null
      if (existingOrder && existingOrder.status === "DRAFT") {
        await ctx.db.patch(pharmacy._id, {
          lowStockAlertSignature: signature,
          lowStockAlertHandledSignature: undefined,
        })
        return existingOrder._id
      }
    }

    const existingOrders = (await ctx.db
      .query("procurementOrders")
      .withIndex("by_pharmacyId_type", (q) =>
        q.eq("pharmacyId", pharmacy._id).eq("type", "PURCHASE_ORDER")
      )
      .collect()) as ProcurementOrderRecord[]

    const maxSequence = existingOrders.reduce((max, order) => {
      const sequence = order.orderSequence ?? parseOrderNumber(order.orderNumber) ?? 0
      return Math.max(max, sequence)
    }, existingOrders.length)

    const orderSequence = maxSequence + 1
    const orderNumber = `BC-${String(orderSequence).padStart(2, "0")}`

    const items = lowStockProducts.map((product) => ({
      productId: product._id,
      quantity: 0,
      unitPrice: product.purchasePrice,
    }))

    const totalAmount = calculateTotal(items)

    const orderId = (await ctx.db.insert("procurementOrders", {
      pharmacyId: pharmacy._id,
      orderNumber,
      orderSequence,
      type: "PURCHASE_ORDER",
      supplierId: args.supplierId,
      status: "DRAFT",
      channel: undefined,
      orderDate: Date.now(),
      dueDate: undefined,
      globalDiscountType: undefined,
      globalDiscountValue: 0,
      totalAmount,
      createdFromAlert: true,
      createdAt: Date.now(),
    })) as Id<"procurementOrders">

    await Promise.all(
      items.map((item) =>
        ctx.db.insert("procurementItems", {
          pharmacyId: pharmacy._id,
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: undefined,
          lineDiscountValue: 0,
          lineTotal: Math.max(0, item.quantity * item.unitPrice),
        })
      )
    )

    await ctx.db.patch(pharmacy._id, {
      lowStockAlertOrderId: orderId,
      lowStockAlertSignature: signature,
      lowStockAlertHandledSignature: undefined,
    })

    return orderId
  },
})

export const syncLowStockDraft = mutation({
  args: {
    clerkOrgId: v.string(),
    orderId: v.id("procurementOrders"),
  },
  returns: v.union(v.id("procurementOrders"), v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const pharmacy = await getPharmacy(ctx, args.clerkOrgId)
    if (!pharmacy) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Pharmacy not found",
      })
    }

    if (!pharmacy.lowStockAlertOrderId || pharmacy.lowStockAlertOrderId !== args.orderId) {
      return null
    }

    const order = (await ctx.db.get(args.orderId)) as ProcurementOrderRecord | null
    if (!order || order.pharmacyId !== pharmacy._id) {
      return null
    }

    if (order.status !== "DRAFT" || order.type !== "PURCHASE_ORDER") {
      return null
    }

    const lowStockProducts = await getLowStockProducts(ctx, pharmacy._id)
    const lowStockById = new Map(lowStockProducts.map((product) => [product._id, product]))

    const existingItems = (await ctx.db
      .query("procurementItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect()) as Array<{
      _id: Id<"procurementItems">
      productId: Id<"products">
      quantity: number
      unitPrice: number
    }>

    const keptItems = existingItems.filter((item) => {
      if (item.quantity > 0) return true
      return lowStockById.has(item.productId)
    })

    const keptProductIds = new Set(keptItems.map((item) => item.productId))

    const missingItems = lowStockProducts
      .filter((product) => !keptProductIds.has(product._id))
      .map((product) => ({
        productId: product._id,
        quantity: 0,
        unitPrice: product.purchasePrice,
      }))

    const nextItems = [
      ...keptItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      ...missingItems,
    ]

    const totalAmount = calculateTotal(nextItems)

    await ctx.db.patch(order._id, {
      totalAmount,
    })

    await Promise.all(existingItems.map((item) => ctx.db.delete(item._id)))

    await Promise.all(
      nextItems.map((item) =>
        ctx.db.insert("procurementItems", {
          pharmacyId: pharmacy._id,
          orderId: order._id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: undefined,
          lineDiscountValue: 0,
          lineTotal: Math.max(0, item.quantity * item.unitPrice),
        })
      )
    )

    const signature = buildLowStockSignature(lowStockProducts)
    await ctx.db.patch(pharmacy._id, {
      lowStockAlertSignature: signature,
      lowStockAlertHandledSignature: undefined,
    })

    return order._id
  },
})
