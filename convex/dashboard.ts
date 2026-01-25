import { query } from "./_generated/server"
import { v } from "convex/values"
import { getAuthOrgId } from "./auth"

const MS_DAY = 24 * 60 * 60 * 1000
const SALE_PREFIX = "FAC-"
const ORDER_PREFIXES = {
  PURCHASE_ORDER: "BC-",
  DELIVERY_NOTE: "BL-",
} as const

function formatSequence(prefix: string, sequence: number) {
  return `${prefix}${String(sequence).padStart(2, "0")}`
}

function toDateKey(value: number) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatTrendLabel(value: number) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  })
}

function buildTrendPoints(days: number, salesByDay: Map<string, number>, now: number) {
  const points = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const dateValue = now - offset * MS_DAY
    const key = toDateKey(dateValue)
    points.push({
      date: formatTrendLabel(dateValue),
      isoDate: key,
      revenue: salesByDay.get(key) ?? 0,
    })
  }
  return points
}

export const getSummary = query({
  args: {
    clerkOrgId: v.string(),
    now: v.number(),
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

    const [sales, products, orders, cashDays] = await Promise.all([
      ctx.db
        .query("sales")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("products")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("procurementOrders")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("cashReconciliations")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
    ])

    const salesByDay = new Map<string, number>()
    const transactionsByDay = new Map<string, number>()
    for (const sale of sales) {
      const key = toDateKey(sale.saleDate)
      salesByDay.set(key, (salesByDay.get(key) ?? 0) + sale.totalAmountTtc)
      transactionsByDay.set(key, (transactionsByDay.get(key) ?? 0) + 1)
    }

    const todayKey = toDateKey(args.now)
    const yesterdayKey = toDateKey(args.now - MS_DAY)
    const todayRevenue = salesByDay.get(todayKey) ?? 0
    const yesterdayRevenue = salesByDay.get(yesterdayKey) ?? 0
    const todayTransactions = transactionsByDay.get(todayKey) ?? 0
    const trend =
      yesterdayRevenue === 0 ? 0 : ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100

    const lowStock = products.filter(
      (product) => product.stockQuantity <= product.lowStockThreshold
    )
    const ruptures = products.filter((product) => product.stockQuantity === 0)

    const pendingOrders = orders.filter((order) => order.status !== "DELIVERED").length
    const deliveredOrders = orders.filter((order) => order.status === "DELIVERED").length

    const latestCash = cashDays.sort((a, b) => b.date.localeCompare(a.date))[0]
    const cashStatus = latestCash?.isLocked ? "Fermée" : "Ouverte"

    const stockItems = lowStock
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 6)
      .map((product) => ({
        id: product._id,
        name: product.name,
        threshold: product.lowStockThreshold,
        stock: product.stockQuantity,
      }))

    const recentSales = await Promise.all(
      sales
        .sort((a, b) => b.saleDate - a.saleDate)
        .slice(0, 5)
        .map(async (sale) => {
          const client = sale.clientId ? await ctx.db.get(sale.clientId) : null
          const payment =
            sale.paymentMethod === "CREDIT"
              ? "Crédit"
              : sale.paymentMethod === "CASH"
                ? "Cash"
                : "Carte"
          return {
            id:
              sale.saleNumber ??
              (sale.saleSequence ? formatSequence(SALE_PREFIX, sale.saleSequence) : sale._id),
            date: toDateKey(sale.saleDate),
            time: new Date(sale.saleDate).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            amount: sale.totalAmountTtc,
            client: client?.name ?? "-",
            payment,
          }
        })
    )

    const recentOrders = await Promise.all(
      orders
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map(async (order) => {
          const supplier = await ctx.db.get(order.supplierId)
          const orderPrefix = ORDER_PREFIXES[order.type] ?? "BC-"
          const orderNumber =
            order.orderNumber ??
            (order.orderSequence ? formatSequence(orderPrefix, order.orderSequence) : order._id)
          return {
            id: orderNumber,
            supplier: supplier?.name ?? "Fournisseur inconnu",
            createdAt: new Date(order.createdAt).toISOString().slice(0, 10),
            date: toDateKey(order.createdAt),
            total: order.totalAmount,
            status: order.status === "DELIVERED" ? "Livré" : "En cours",
          }
        })
    )

    return {
      sales: {
        revenue: todayRevenue,
        transactions: todayTransactions,
        trend,
      },
      cash: {
        status: cashStatus,
        floatAmount: latestCash?.opening ?? 0,
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
      trendData: {
        "7J": buildTrendPoints(7, salesByDay, args.now),
        "30J": buildTrendPoints(30, salesByDay, args.now),
        TRIM: buildTrendPoints(90, salesByDay, args.now),
      },
      stockItems,
      recentSales,
      recentOrders,
    }
  },
})
