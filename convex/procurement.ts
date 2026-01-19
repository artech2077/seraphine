import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess, getAuthOrgId } from "./auth"

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
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .filter((q) => q.eq(q.field("type"), args.type))
      .collect()

    return Promise.all(
      orders.map(async (order) => {
        const supplier = await ctx.db.get(order.supplierId)
        const items = await ctx.db
          .query("procurementItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect()

        const mappedItems = await Promise.all(
          items.map(async (item) => {
            const product = await ctx.db.get(item.productId)
            return {
              id: item._id,
              productName: product?.name ?? "Produit inconnu",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            }
          })
        )

        return {
          id: order._id,
          supplierName: supplier?.name ?? "Fournisseur inconnu",
          channel: order.channel ?? null,
          createdAt: order.createdAt,
          orderDate: order.orderDate,
          totalAmount: order.totalAmount,
          status: order.status,
          type: order.type,
          externalReference: order.externalReference ?? null,
          items: mappedItems,
        }
      })
    )
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
    totalAmount: v.number(),
    externalReference: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        unitPrice: v.number(),
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

    const orderId = await ctx.db.insert("procurementOrders", {
      pharmacyId: pharmacy._id,
      type: args.type,
      supplierId: args.supplierId,
      status: args.status,
      externalReference: args.externalReference,
      channel: args.channel,
      orderDate: args.orderDate,
      totalAmount: args.totalAmount,
      createdAt: Date.now(),
    })

    await Promise.all(
      args.items.map((item) =>
        ctx.db.insert("procurementItems", {
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
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
    totalAmount: v.number(),
    externalReference: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        unitPrice: v.number(),
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

    await ctx.db.patch(args.id, {
      supplierId: args.supplierId,
      status: args.status,
      externalReference: args.externalReference,
      channel: args.channel,
      orderDate: args.orderDate,
      totalAmount: args.totalAmount,
    })

    const existingItems = await ctx.db
      .query("procurementItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect()

    await Promise.all(existingItems.map((item) => ctx.db.delete(item._id)))

    await Promise.all(
      args.items.map((item) =>
        ctx.db.insert("procurementItems", {
          orderId: args.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
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
