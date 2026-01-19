import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgAccess, getAuthOrgId } from "./auth"

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

    return Promise.all(
      sales.map(async (sale) => {
        const client = sale.clientId ? await ctx.db.get(sale.clientId) : null
        const seller = await ctx.db.get(sale.sellerId)
        const items = await ctx.db
          .query("saleItems")
          .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
          .collect()

        return {
          ...sale,
          clientName: client?.name,
          sellerName: seller?.name,
          items,
        }
      })
    )
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
