import { v } from "convex/values"

import { getAuthOrgId } from "./auth"
import type { Id } from "./_generated/dataModel"
import { query } from "./_generated/server"

const expiryWindowValidator = v.union(v.literal(30), v.literal(60), v.literal(90))
const expirySeverityValidator = v.union(
  v.literal("EXPIRED"),
  v.literal("CRITICAL"),
  v.literal("WARNING"),
  v.literal("WATCH")
)

type ExpirySeverity = "EXPIRED" | "CRITICAL" | "WARNING" | "WATCH"

const DAY_IN_MS = 24 * 60 * 60 * 1000

function normalizeLotNumberSearch(value: string) {
  return value.trim().toUpperCase()
}

function getExpirySeverity(daysToExpiry: number): ExpirySeverity | null {
  if (daysToExpiry < 0) {
    return "EXPIRED"
  }
  if (daysToExpiry <= 30) {
    return "CRITICAL"
  }
  if (daysToExpiry <= 60) {
    return "WARNING"
  }
  if (daysToExpiry <= 90) {
    return "WATCH"
  }
  return null
}

function getRecommendedAction(severity: ExpirySeverity) {
  if (severity === "EXPIRED") {
    return {
      action: "Bloquer le lot et lancer retrait ou retour fournisseur.",
      pathLabel: "Ajuster le stock",
      pathHref: "/app/inventaire",
    }
  }
  if (severity === "CRITICAL") {
    return {
      action: "Prioriser la vente FEFO ou initier un retour fournisseur.",
      pathLabel: "Prioriser la vente",
      pathHref: "/app/ventes",
    }
  }
  if (severity === "WARNING") {
    return {
      action: "Planifier l'ecoulement prioritaire de ce lot.",
      pathLabel: "Planifier la vente",
      pathHref: "/app/ventes",
    }
  }
  return {
    action: "Surveiller ce lot et preparer une action preventive.",
    pathLabel: "Suivre l'inventaire",
    pathHref: "/app/inventaire",
  }
}

export const listByOrg = query({
  args: {
    clerkOrgId: v.string(),
    productId: v.optional(v.id("products")),
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

    const lots = args.productId
      ? await ctx.db
          .query("stockLots")
          .withIndex("by_pharmacyId_productId", (q) =>
            q.eq("pharmacyId", pharmacy._id).eq("productId", args.productId as Id<"products">)
          )
          .collect()
      : await ctx.db
          .query("stockLots")
          .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
          .collect()

    const positiveLots = lots.filter((lot) => lot.quantity > 0)
    if (positiveLots.length === 0) {
      return []
    }

    const products = await ctx.db
      .query("products")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()
    const productsById = new Map(products.map((product) => [String(product._id), product.name]))

    const grouped = new Map<
      string,
      {
        productId: Id<"products">
        productName: string
        totalQuantity: number
        lots: Array<{
          id: Id<"stockLots">
          lotNumber: string
          expiryDate: number
          quantity: number
          sourceType: "DELIVERY_NOTE" | "MIGRATION"
          sourceOrderId: string | null
          sourceItemId: string | null
          createdAt: number
        }>
      }
    >()

    positiveLots.forEach((lot) => {
      const key = String(lot.productId)
      const current = grouped.get(key) ?? {
        productId: lot.productId,
        productName: productsById.get(key) ?? "Produit inconnu",
        totalQuantity: 0,
        lots: [],
      }

      current.totalQuantity += lot.quantity
      current.lots.push({
        id: lot._id,
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate,
        quantity: lot.quantity,
        sourceType: lot.sourceType,
        sourceOrderId: lot.sourceOrderId ? String(lot.sourceOrderId) : null,
        sourceItemId: lot.sourceItemId ? String(lot.sourceItemId) : null,
        createdAt: lot.createdAt,
      })

      grouped.set(key, current)
    })

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        lots: group.lots.sort((left, right) =>
          left.expiryDate === right.expiryDate
            ? left.lotNumber.localeCompare(right.lotNumber, "fr")
            : left.expiryDate - right.expiryDate
        ),
      }))
      .sort((left, right) => left.productName.localeCompare(right.productName, "fr"))
  },
})

export const listExpiryRisk = query({
  args: {
    clerkOrgId: v.string(),
    windowDays: v.optional(expiryWindowValidator),
    filters: v.optional(
      v.object({
        productIds: v.optional(v.array(v.id("products"))),
        categories: v.optional(v.array(v.string())),
        supplierIds: v.optional(v.array(v.id("suppliers"))),
        severities: v.optional(v.array(expirySeverityValidator)),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const orgId = getAuthOrgId(identity)
    if (!orgId || orgId !== args.clerkOrgId) {
      return {
        items: [],
        counts: {
          total: 0,
          expired: 0,
          dueIn30Days: 0,
          dueIn60Days: 0,
          dueIn90Days: 0,
        },
        filterOptions: {
          products: [],
          categories: [],
          suppliers: [],
          severities: ["EXPIRED", "CRITICAL", "WARNING", "WATCH"] as ExpirySeverity[],
        },
      }
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      return {
        items: [],
        counts: {
          total: 0,
          expired: 0,
          dueIn30Days: 0,
          dueIn60Days: 0,
          dueIn90Days: 0,
        },
        filterOptions: {
          products: [],
          categories: [],
          suppliers: [],
          severities: ["EXPIRED", "CRITICAL", "WARNING", "WATCH"] as ExpirySeverity[],
        },
      }
    }

    const [lots, products, orders, suppliers] = await Promise.all([
      ctx.db
        .query("stockLots")
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
        .query("suppliers")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
    ])

    const now = Date.now()
    const windowDays = args.windowDays ?? 90

    const productById = new Map(products.map((product) => [String(product._id), product]))
    const orderById = new Map(orders.map((order) => [String(order._id), order]))
    const supplierById = new Map(suppliers.map((supplier) => [String(supplier._id), supplier]))

    const baseItems = lots
      .filter((lot) => lot.quantity > 0)
      .map((lot) => {
        const product = productById.get(String(lot.productId))
        if (!product) {
          return null
        }

        const daysToExpiry = Math.floor((lot.expiryDate - now) / DAY_IN_MS)
        const severity = getExpirySeverity(daysToExpiry)
        if (!severity) {
          return null
        }

        const order = lot.sourceOrderId ? orderById.get(String(lot.sourceOrderId)) : null
        const supplier = order?.supplierId ? supplierById.get(String(order.supplierId)) : null
        const recommendation = getRecommendedAction(severity)

        return {
          lotId: lot._id,
          productId: lot.productId,
          productName: product.name,
          productCategory: product.category,
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate,
          daysToExpiry,
          quantity: lot.quantity,
          supplierId: supplier?._id ?? null,
          supplierName: supplier?.name ?? null,
          severity,
          recommendedAction: recommendation.action,
          recommendedPathLabel: recommendation.pathLabel,
          recommendedPathHref: recommendation.pathHref,
          lotDetailPath: `/app/produit?productId=${product._id}&lotNumber=${encodeURIComponent(lot.lotNumber)}`,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    const productIdsFilter = new Set((args.filters?.productIds ?? []).map((id) => String(id)))
    const categoryFilter = new Set(args.filters?.categories ?? [])
    const supplierFilter = new Set((args.filters?.supplierIds ?? []).map((id) => String(id)))
    const severityFilter = new Set(args.filters?.severities ?? [])

    const items = baseItems
      .filter((item) => item.daysToExpiry <= windowDays)
      .filter((item) => {
        if (productIdsFilter.size > 0 && !productIdsFilter.has(String(item.productId))) {
          return false
        }
        if (categoryFilter.size > 0 && !categoryFilter.has(item.productCategory)) {
          return false
        }
        if (supplierFilter.size > 0) {
          if (!item.supplierId || !supplierFilter.has(String(item.supplierId))) {
            return false
          }
        }
        if (severityFilter.size > 0 && !severityFilter.has(item.severity)) {
          return false
        }
        return true
      })
      .sort((left, right) =>
        left.expiryDate === right.expiryDate
          ? left.productName.localeCompare(right.productName, "fr")
          : left.expiryDate - right.expiryDate
      )

    const counts = items.reduce(
      (accumulator, item) => {
        accumulator.total += 1
        if (item.daysToExpiry < 0) {
          accumulator.expired += 1
        }
        if (item.daysToExpiry <= 30) {
          accumulator.dueIn30Days += 1
        }
        if (item.daysToExpiry <= 60) {
          accumulator.dueIn60Days += 1
        }
        if (item.daysToExpiry <= 90) {
          accumulator.dueIn90Days += 1
        }
        return accumulator
      },
      {
        total: 0,
        expired: 0,
        dueIn30Days: 0,
        dueIn60Days: 0,
        dueIn90Days: 0,
      }
    )

    const filterOptions = {
      products: Array.from(
        new Map(baseItems.map((item) => [String(item.productId), item.productName])).entries()
      )
        .map(([id, name]) => ({ id: id as Id<"products">, name }))
        .sort((left, right) => left.name.localeCompare(right.name, "fr")),
      categories: Array.from(new Set(baseItems.map((item) => item.productCategory))).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
      suppliers: Array.from(
        new Map(
          baseItems
            .filter((item) => item.supplierId && item.supplierName)
            .map((item) => [String(item.supplierId), item.supplierName as string])
        ).entries()
      )
        .map(([id, name]) => ({ id: id as Id<"suppliers">, name }))
        .sort((left, right) => left.name.localeCompare(right.name, "fr")),
      severities: ["EXPIRED", "CRITICAL", "WARNING", "WATCH"] as ExpirySeverity[],
    }

    return {
      items,
      counts,
      filterOptions,
    }
  },
})

export const getLotTraceabilityReport = query({
  args: {
    clerkOrgId: v.string(),
    lotNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const orgId = getAuthOrgId(identity)
    const normalizedLotNumber = normalizeLotNumberSearch(args.lotNumber)

    if (!orgId || orgId !== args.clerkOrgId || !normalizedLotNumber) {
      return {
        lotNumber: normalizedLotNumber,
        items: [],
      }
    }

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      return {
        lotNumber: normalizedLotNumber,
        items: [],
      }
    }

    const [
      lots,
      products,
      suppliers,
      procurementOrders,
      procurementItemLots,
      saleItemLots,
      stockMovements,
    ] = await Promise.all([
      ctx.db
        .query("stockLots")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("products")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("suppliers")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("procurementOrders")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("procurementItemLots")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("saleItemLots")
        .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
      ctx.db
        .query("stockMovements")
        .withIndex("by_pharmacyId_createdAt", (q) => q.eq("pharmacyId", pharmacy._id))
        .collect(),
    ])

    const productById = new Map(products.map((product) => [String(product._id), product]))
    const supplierById = new Map(suppliers.map((supplier) => [String(supplier._id), supplier]))
    const orderById = new Map(procurementOrders.map((order) => [String(order._id), order]))

    const matchingLots = lots.filter((lot) => lot.lotNumber.toUpperCase() === normalizedLotNumber)
    if (matchingLots.length === 0) {
      return {
        lotNumber: normalizedLotNumber,
        items: [],
      }
    }

    const items = matchingLots
      .map((lot) => {
        const product = productById.get(String(lot.productId))
        if (!product) {
          return null
        }

        const lotProcurements = procurementItemLots.filter(
          (procurementLot) =>
            String(procurementLot.productId) === String(lot.productId) &&
            procurementLot.lotNumber === lot.lotNumber &&
            procurementLot.expiryDate === lot.expiryDate
        )
        const lotSales = saleItemLots.filter(
          (saleLot) =>
            String(saleLot.productId) === String(lot.productId) &&
            saleLot.lotNumber === lot.lotNumber &&
            saleLot.expiryDate === lot.expiryDate
        )
        const lotMovements = stockMovements.filter(
          (movement) =>
            String(movement.productId) === String(lot.productId) &&
            movement.lotNumber === lot.lotNumber &&
            movement.lotExpiryDate === lot.expiryDate
        )

        const receivedQuantity = lotProcurements.reduce((sum, row) => sum + row.quantity, 0)
        const soldQuantity = lotSales.reduce((sum, row) => sum + row.quantity, 0)

        const supplierIdCandidates = [
          lot.sourceOrderId ? orderById.get(String(lot.sourceOrderId))?.supplierId : null,
          lotProcurements
            .map((procurementLot) => orderById.get(String(procurementLot.orderId))?.supplierId)
            .find(Boolean) ?? null,
        ].filter(Boolean)

        const supplierId = supplierIdCandidates[0] ?? null
        const supplierName = supplierId
          ? (supplierById.get(String(supplierId))?.name ?? null)
          : null

        const timeline = [
          ...lotProcurements.map((procurementLot) => {
            const order = orderById.get(String(procurementLot.orderId))
            return {
              id: `receive-${String(procurementLot._id)}`,
              createdAt: procurementLot.createdAt,
              eventType: "RECEPTION" as const,
              delta: procurementLot.quantity,
              reason: "Reception fournisseur",
              reference: order?.orderNumber ?? String(procurementLot.orderId),
            }
          }),
          ...lotMovements.map((movement) => ({
            id: `movement-${String(movement._id)}`,
            createdAt: movement.createdAt,
            eventType:
              movement.delta < 0
                ? ("SORTIE" as const)
                : movement.delta > 0
                  ? ("RETOUR" as const)
                  : ("MOUVEMENT" as const),
            delta: movement.delta,
            reason: movement.reason ?? movement.movementType,
            reference: movement.sourceId ?? movement.movementType,
          })),
        ].sort((left, right) => left.createdAt - right.createdAt)

        return {
          lotId: lot._id,
          productId: lot.productId,
          productName: product.name,
          productCategory: product.category,
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate,
          currentBalance: lot.quantity,
          receivedQuantity,
          soldQuantity,
          supplierId: supplierId ?? null,
          supplierName,
          recallReportPath: `/app/inventaire?lotNumber=${encodeURIComponent(lot.lotNumber)}`,
          timeline,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) =>
        left.expiryDate === right.expiryDate
          ? left.productName.localeCompare(right.productName, "fr")
          : left.expiryDate - right.expiryDate
      )

    return {
      lotNumber: normalizedLotNumber,
      items,
    }
  },
})
