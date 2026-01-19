import { query } from "./_generated/server"
import { v } from "convex/values"
import { getAuthOrgId } from "./auth"

export const getSummary = query({
  args: {
    clerkOrgId: v.string(),
  },
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

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmountTtc, 0)
    const transactions = sales.length

    const products = await ctx.db
      .query("products")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    const lowStock = products.filter(
      (product) => product.stockQuantity <= product.lowStockThreshold
    )
    const ruptures = products.filter((product) => product.stockQuantity === 0)

    const orders = await ctx.db
      .query("procurementOrders")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    const pendingOrders = orders.filter((order) => order.status !== "DELIVERED").length
    const deliveredOrders = orders.filter((order) => order.status === "DELIVERED").length

    return {
      sales: {
        revenue: totalRevenue,
        transactions,
        trend: 0,
      },
      cash: {
        status: "Ouverte",
        floatAmount: 0,
      },
      stockAlerts: {
        total: lowStock.length,
        ruptures: ruptures.length,
        lowStock: lowStock.length,
      },
      orders: {
        pending: pendingOrders,
        delivered: deliveredOrders,
      },
    }
  },
})
