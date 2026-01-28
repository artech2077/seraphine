import { mutation, type MutationCtx } from "./_generated/server"
import type { Id, TableNames } from "./_generated/dataModel"
import { v } from "convex/values"
import { assertOrgAccess } from "./auth"

type SequenceRecord = {
  _id: Id<TableNames>
}

type BackfillOptions<T> = {
  prefix: string
  numberField: string
  sequenceField: string
  getNumber: (record: T) => string | null | undefined
  getSequence: (record: T) => number | null | undefined
  getSortValue: (record: T) => number
}

type ProcurementItemRecord = {
  _id: Id<"procurementItems">
  orderId: Id<"procurementOrders">
  pharmacyId?: Id<"pharmacies">
  quantity: number
  unitPrice: number
  lineDiscountType?: "PERCENT" | "AMOUNT"
  lineDiscountValue?: number
  lineTotal?: number
}

type ProcurementOrderRecord = {
  _id: Id<"procurementOrders">
  pharmacyId: Id<"pharmacies">
  globalDiscountType?: "PERCENT" | "AMOUNT"
  globalDiscountValue?: number
  totalAmount: number
}

function formatSequence(prefix: string, sequence: number) {
  return `${prefix}${String(sequence).padStart(2, "0")}`
}

function parseSequence(prefix: string, value?: string | null) {
  if (!value) return null
  const escaped = prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
  const match = value.match(new RegExp(`^${escaped}(\\d+)$`))
  if (!match) return null
  return Number(match[1])
}

function getDiscountAmount(subtotal: number, type?: "PERCENT" | "AMOUNT", value?: number) {
  const discountValue = value ?? 0
  if (type === "AMOUNT") {
    return discountValue
  }
  return (subtotal * discountValue) / 100
}

function calculateLineTotal(item: ProcurementItemRecord) {
  const subtotal = item.quantity * item.unitPrice
  const discount = getDiscountAmount(subtotal, item.lineDiscountType, item.lineDiscountValue)
  return Math.max(0, subtotal - discount)
}

function calculateOrderTotal(
  items: ProcurementItemRecord[],
  globalDiscountType?: "PERCENT" | "AMOUNT",
  globalDiscountValue?: number
) {
  const subtotal = items.reduce((sum, item) => sum + calculateLineTotal(item), 0)
  const discount = getDiscountAmount(subtotal, globalDiscountType, globalDiscountValue)
  return Math.max(0, subtotal - discount)
}

async function backfillSequences<T extends SequenceRecord>(
  ctx: MutationCtx,
  records: T[],
  options: BackfillOptions<T>
) {
  const usedSequences = new Set<number>()
  const pending = [] as Array<{ record: T; sequence?: number }>

  records.forEach((record) => {
    const sequence = options.getSequence(record)
    const number = options.getNumber(record)
    const parsed = parseSequence(options.prefix, number)
    if (sequence && number && parsed === sequence) {
      usedSequences.add(sequence)
      return
    }
    if (sequence) {
      usedSequences.add(sequence)
      pending.push({ record, sequence })
      return
    }
    if (parsed) {
      usedSequences.add(parsed)
      pending.push({ record, sequence: parsed })
      return
    }
    pending.push({ record })
  })

  const missing = pending
    .filter((item) => item.sequence === undefined)
    .sort((a, b) => options.getSortValue(a.record) - options.getSortValue(b.record))

  let nextSequence = 1
  missing.forEach((item) => {
    while (usedSequences.has(nextSequence)) {
      nextSequence += 1
    }
    item.sequence = nextSequence
    usedSequences.add(nextSequence)
    nextSequence += 1
  })

  const updates = pending
    .filter((item) => {
      const currentSequence = options.getSequence(item.record)
      const currentNumber = options.getNumber(item.record)
      const parsed = parseSequence(options.prefix, currentNumber)
      return currentSequence !== item.sequence || parsed !== item.sequence
    })
    .map((item) => ({
      id: item.record._id,
      sequence: item.sequence ?? 1,
      number: formatSequence(options.prefix, item.sequence ?? 1),
    }))

  await Promise.all(
    updates.map((update) =>
      ctx.db.patch(update.id, {
        [options.numberField]: update.number,
        [options.sequenceField]: update.sequence,
      })
    )
  )

  return updates.length
}

export const backfillIdentifiers = mutation({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      return {
        pharmacies: 0,
        sales: 0,
        clients: 0,
        suppliers: 0,
        cashReconciliations: 0,
        purchaseOrders: 0,
        deliveryNotes: 0,
      }
    }

    const pharmaciesUpdated = await backfillSequences(ctx, [pharmacy], {
      prefix: "PHARM-",
      numberField: "pharmacyNumber",
      sequenceField: "pharmacySequence",
      getNumber: (record) => (record as { pharmacyNumber?: string }).pharmacyNumber,
      getSequence: (record) => (record as { pharmacySequence?: number }).pharmacySequence,
      getSortValue: (record) => (record as { createdAt?: number }).createdAt ?? 0,
    })

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()
    const salesUpdated = await backfillSequences(ctx, sales, {
      prefix: "FAC-",
      numberField: "saleNumber",
      sequenceField: "saleSequence",
      getNumber: (record) => (record as { saleNumber?: string }).saleNumber,
      getSequence: (record) => (record as { saleSequence?: number }).saleSequence,
      getSortValue: (record) =>
        (record as { createdAt?: number; saleDate?: number }).createdAt ??
        (record as { saleDate?: number }).saleDate ??
        0,
    })

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()
    const clientsUpdated = await backfillSequences(ctx, clients, {
      prefix: "CLI-",
      numberField: "clientNumber",
      sequenceField: "clientSequence",
      getNumber: (record) => (record as { clientNumber?: string }).clientNumber,
      getSequence: (record) => (record as { clientSequence?: number }).clientSequence,
      getSortValue: (record) => (record as { createdAt?: number }).createdAt ?? 0,
    })

    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()
    const suppliersUpdated = await backfillSequences(ctx, suppliers, {
      prefix: "FOUR-",
      numberField: "supplierNumber",
      sequenceField: "supplierSequence",
      getNumber: (record) => (record as { supplierNumber?: string }).supplierNumber,
      getSequence: (record) => (record as { supplierSequence?: number }).supplierSequence,
      getSortValue: (record) => (record as { createdAt?: number }).createdAt ?? 0,
    })

    const cashRecords = await ctx.db
      .query("cashReconciliations")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()
    const cashUpdated = await backfillSequences(ctx, cashRecords, {
      prefix: "CASH-",
      numberField: "cashNumber",
      sequenceField: "cashSequence",
      getNumber: (record) => (record as { cashNumber?: string }).cashNumber,
      getSequence: (record) => (record as { cashSequence?: number }).cashSequence,
      getSortValue: (record) => {
        const typed = record as { createdAt?: number; date?: string }
        return typed.createdAt ?? (typed.date ? Date.parse(typed.date) : 0)
      },
    })

    const orders = await ctx.db
      .query("procurementOrders")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    const purchaseOrdersUpdated = await backfillSequences(
      ctx,
      orders.filter((order) => order.type === "PURCHASE_ORDER"),
      {
        prefix: "BC-",
        numberField: "orderNumber",
        sequenceField: "orderSequence",
        getNumber: (record) => (record as { orderNumber?: string }).orderNumber,
        getSequence: (record) => (record as { orderSequence?: number }).orderSequence,
        getSortValue: (record) =>
          (record as { createdAt?: number; orderDate?: number }).createdAt ??
          (record as { orderDate?: number }).orderDate ??
          0,
      }
    )

    const deliveryNotesUpdated = await backfillSequences(
      ctx,
      orders.filter((order) => order.type === "DELIVERY_NOTE"),
      {
        prefix: "BL-",
        numberField: "orderNumber",
        sequenceField: "orderSequence",
        getNumber: (record) => (record as { orderNumber?: string }).orderNumber,
        getSequence: (record) => (record as { orderSequence?: number }).orderSequence,
        getSortValue: (record) =>
          (record as { createdAt?: number; orderDate?: number }).createdAt ??
          (record as { orderDate?: number }).orderDate ??
          0,
      }
    )

    return {
      pharmacies: pharmaciesUpdated,
      sales: salesUpdated,
      clients: clientsUpdated,
      suppliers: suppliersUpdated,
      cashReconciliations: cashUpdated,
      purchaseOrders: purchaseOrdersUpdated,
      deliveryNotes: deliveryNotesUpdated,
    }
  },
})

export const backfillProcurementItemPharmacy = mutation({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      return 0
    }

    const orders = await ctx.db
      .query("procurementOrders")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    if (orders.length === 0) {
      return 0
    }

    let updated = 0
    const patches: Array<Promise<void>> = []

    for (const order of orders) {
      const items = await ctx.db
        .query("procurementItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect()

      items.forEach((item) => {
        if (item.pharmacyId === pharmacy._id) {
          return
        }
        updated += 1
        patches.push(ctx.db.patch(item._id, { pharmacyId: pharmacy._id }))
      })
    }

    await Promise.all(patches)

    return updated
  },
})

export const backfillProcurementDiscounts = mutation({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      return {
        orders: 0,
        items: 0,
      }
    }

    const orders = (await ctx.db
      .query("procurementOrders")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()) as ProcurementOrderRecord[]

    if (orders.length === 0) {
      return {
        orders: 0,
        items: 0,
      }
    }

    const items = (await ctx.db
      .query("procurementItems")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()) as ProcurementItemRecord[]

    const itemsByOrder = new Map<string, ProcurementItemRecord[]>()
    items.forEach((item) => {
      const orderItems = itemsByOrder.get(String(item.orderId)) ?? []
      orderItems.push(item)
      itemsByOrder.set(String(item.orderId), orderItems)
    })

    let updatedOrders = 0
    let updatedItems = 0

    for (const order of orders) {
      let orderItems = itemsByOrder.get(String(order._id)) ?? []
      if (orderItems.length === 0) {
        orderItems = (await ctx.db
          .query("procurementItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect()) as ProcurementItemRecord[]
      }

      const normalizedItems = [] as ProcurementItemRecord[]
      for (const item of orderItems) {
        const nextType = item.lineDiscountType ?? "PERCENT"
        const nextValue = item.lineDiscountValue ?? 0
        const nextLineTotal = calculateLineTotal({
          ...item,
          lineDiscountType: nextType,
          lineDiscountValue: nextValue,
        })

        if (
          item.lineDiscountType !== nextType ||
          item.lineDiscountValue !== nextValue ||
          item.lineTotal !== nextLineTotal
        ) {
          await ctx.db.patch(item._id, {
            lineDiscountType: nextType,
            lineDiscountValue: nextValue,
            lineTotal: nextLineTotal,
          })
          updatedItems += 1
        }

        normalizedItems.push({
          ...item,
          lineDiscountType: nextType,
          lineDiscountValue: nextValue,
          lineTotal: nextLineTotal,
        })
      }

      const normalizedGlobalType = order.globalDiscountType ?? "PERCENT"
      const normalizedGlobalValue = order.globalDiscountValue ?? 0
      const nextTotal = calculateOrderTotal(
        normalizedItems,
        normalizedGlobalType,
        normalizedGlobalValue
      )
      const needsOrderPatch =
        order.globalDiscountType !== normalizedGlobalType ||
        order.globalDiscountValue !== normalizedGlobalValue ||
        order.totalAmount !== nextTotal

      if (needsOrderPatch) {
        await ctx.db.patch(order._id, {
          globalDiscountType: normalizedGlobalType,
          globalDiscountValue: normalizedGlobalValue,
          totalAmount: nextTotal,
        })
        updatedOrders += 1
      }
    }

    return {
      orders: updatedOrders,
      items: updatedItems,
    }
  },
})

export const backfillSaleItemPharmacy = mutation({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    assertOrgAccess(identity, args.clerkOrgId)

    const pharmacy = await ctx.db
      .query("pharmacies")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique()

    if (!pharmacy) {
      return 0
    }

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", pharmacy._id))
      .collect()

    if (sales.length === 0) {
      return 0
    }

    let updated = 0
    const patches: Array<Promise<void>> = []

    for (const sale of sales) {
      const items = await ctx.db
        .query("saleItems")
        .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
        .collect()

      items.forEach((item) => {
        if (item.pharmacyId === pharmacy._id) {
          return
        }
        updated += 1
        patches.push(ctx.db.patch(item._id, { pharmacyId: pharmacy._id }))
      })
    }

    await Promise.all(patches)

    return updated
  },
})
