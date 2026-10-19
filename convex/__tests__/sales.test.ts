import { vi } from "vitest"

import { create, listByOrg, listByOrgPaginated, remove, update } from "@/convex/sales"
import { getHandler, type ConvexHandler } from "@/convex/__tests__/test_utils"

describe("convex/sales", () => {
  it("returns sales for the org", async () => {
    const ctx = buildContext()

    const handler = getHandler(listByOrg) as ConvexHandler<{ clerkOrgId: string }, unknown[]>

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toEqual([
      expect.objectContaining({
        _id: "sale-1",
        clientName: "Client A",
        sellerName: "Seller",
        items: [expect.objectContaining({ _id: "item-1" })],
      }),
    ])
  })

  it("creates sale, user, line items, and stock movement", async () => {
    const ctx = buildContext({ existingUser: null })

    const handler = getHandler(create) as ConvexHandler<{
      clerkOrgId: string
      saleDate: number
      clientId: string
      paymentMethod: string
      globalDiscountType: string
      globalDiscountValue: number
      totalAmountHt: number
      totalAmountTtc: number
      items: Array<{
        productId: string
        productNameSnapshot: string
        quantity: number
        unitPriceHt: number
        vatRate: number
        lineDiscountType: string
        lineDiscountValue: number
        totalLineTtc: number
      }>
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      saleDate: 123,
      clientId: "client-1",
      paymentMethod: "CASH",
      globalDiscountType: "PERCENT",
      globalDiscountValue: 10,
      totalAmountHt: 100,
      totalAmountTtc: 110,
      items: [
        {
          productId: "product-1",
          productNameSnapshot: "Produit A",
          quantity: 1,
          unitPriceHt: 100,
          vatRate: 10,
          lineDiscountType: "PERCENT",
          lineDiscountValue: 10,
          totalLineTtc: 99,
        },
      ],
    })

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "users",
      expect.objectContaining({ clerkUserId: "user-1" })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "sales",
      expect.objectContaining({
        pharmacyId: "pharmacy-1",
        saleNumber: "FAC-02",
        saleSequence: 2,
      })
    )
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({
        stockQuantity: 4,
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "stockMovements",
      expect.objectContaining({
        pharmacyId: "pharmacy-1",
        productId: "product-1",
        productNameSnapshot: "Produit A",
        delta: -1,
        movementType: "SALE_STOCK_SYNC",
        reason: "Création de vente",
        sourceId: "sale-1",
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "saleItems",
      expect.objectContaining({ pharmacyId: "pharmacy-1", productId: "product-1" })
    )
  })

  it("blocks sale creation when stock would go negative", async () => {
    const ctx = buildContext({ productStocks: { "product-1": 0 } })

    const handler = getHandler(create) as ConvexHandler<{
      clerkOrgId: string
      saleDate: number
      paymentMethod: string
      totalAmountHt: number
      totalAmountTtc: number
      items: Array<{
        productId: string
        productNameSnapshot: string
        quantity: number
        unitPriceHt: number
        vatRate: number
        totalLineTtc: number
      }>
    }>

    await expect(
      handler(ctx, {
        clerkOrgId: "org-1",
        saleDate: 123,
        paymentMethod: "CASH",
        totalAmountHt: 100,
        totalAmountTtc: 110,
        items: [
          {
            productId: "product-1",
            productNameSnapshot: "Produit A",
            quantity: 1,
            unitPriceHt: 100,
            vatRate: 10,
            totalLineTtc: 110,
          },
        ],
      })
    ).rejects.toThrow("Stock insuffisant pour Produit A")

    expect(ctx.db.patch).not.toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({ stockQuantity: expect.any(Number) })
    )
    expect(ctx.db.insert).not.toHaveBeenCalledWith("stockMovements", expect.anything())
  })

  it("allocates a sale from a single lot when stock lots exist", async () => {
    const ctx = buildContext({
      stockLots: [
        {
          _id: "lot-1",
          pharmacyId: "pharmacy-1",
          productId: "product-1",
          lotNumber: "LOT-001",
          expiryDate: Date.parse("2030-01-01"),
          quantity: 5,
        },
      ],
    })

    const handler = getHandler(create) as ConvexHandler<{
      clerkOrgId: string
      saleDate: number
      paymentMethod: string
      totalAmountHt: number
      totalAmountTtc: number
      items: Array<{
        productId: string
        productNameSnapshot: string
        quantity: number
        unitPriceHt: number
        vatRate: number
        totalLineTtc: number
      }>
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      saleDate: 123,
      paymentMethod: "CASH",
      totalAmountHt: 100,
      totalAmountTtc: 110,
      items: [
        {
          productId: "product-1",
          productNameSnapshot: "Produit A",
          quantity: 2,
          unitPriceHt: 100,
          vatRate: 10,
          totalLineTtc: 110,
        },
      ],
    })

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "saleItemLots",
      expect.objectContaining({
        saleId: "sale-1",
        productId: "product-1",
        lotNumber: "LOT-001",
        quantity: 2,
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "stockMovements",
      expect.objectContaining({
        productId: "product-1",
        delta: -2,
        lotNumber: "LOT-001",
        movementType: "SALE_STOCK_SYNC",
      })
    )
  })

  it("allocates from earliest expiry first across multiple lots", async () => {
    const ctx = buildContext({
      stockLots: [
        {
          _id: "lot-late",
          pharmacyId: "pharmacy-1",
          productId: "product-1",
          lotNumber: "LOT-999",
          expiryDate: Date.parse("2031-01-01"),
          quantity: 2,
        },
        {
          _id: "lot-early",
          pharmacyId: "pharmacy-1",
          productId: "product-1",
          lotNumber: "LOT-001",
          expiryDate: Date.parse("2030-01-01"),
          quantity: 1,
        },
      ],
    })

    const handler = getHandler(create) as ConvexHandler<{
      clerkOrgId: string
      saleDate: number
      paymentMethod: string
      totalAmountHt: number
      totalAmountTtc: number
      items: Array<{
        productId: string
        productNameSnapshot: string
        quantity: number
        unitPriceHt: number
        vatRate: number
        totalLineTtc: number
      }>
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      saleDate: 123,
      paymentMethod: "CASH",
      totalAmountHt: 100,
      totalAmountTtc: 110,
      items: [
        {
          productId: "product-1",
          productNameSnapshot: "Produit A",
          quantity: 2,
          unitPriceHt: 100,
          vatRate: 10,
          totalLineTtc: 110,
        },
      ],
    })

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "saleItemLots",
      expect.objectContaining({
        lotNumber: "LOT-001",
        quantity: 1,
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "saleItemLots",
      expect.objectContaining({
        lotNumber: "LOT-999",
        quantity: 1,
      })
    )
  })

  it("returns explicit error when lots are insufficient", async () => {
    const ctx = buildContext({
      stockLots: [
        {
          _id: "lot-1",
          pharmacyId: "pharmacy-1",
          productId: "product-1",
          lotNumber: "LOT-001",
          expiryDate: Date.parse("2030-01-01"),
          quantity: 1,
        },
      ],
    })

    const handler = getHandler(create) as ConvexHandler<{
      clerkOrgId: string
      saleDate: number
      paymentMethod: string
      totalAmountHt: number
      totalAmountTtc: number
      items: Array<{
        productId: string
        productNameSnapshot: string
        quantity: number
        unitPriceHt: number
        vatRate: number
        totalLineTtc: number
      }>
    }>

    await expect(
      handler(ctx, {
        clerkOrgId: "org-1",
        saleDate: 123,
        paymentMethod: "CASH",
        totalAmountHt: 100,
        totalAmountTtc: 110,
        items: [
          {
            productId: "product-1",
            productNameSnapshot: "Produit A",
            quantity: 2,
            unitPriceHt: 100,
            vatRate: 10,
            totalLineTtc: 110,
          },
        ],
      })
    ).rejects.toThrow("Stock lot insuffisant pour Produit A")
  })

  it("paginates sales for the org", async () => {
    const ctx = buildContext()

    const handler = getHandler(listByOrgPaginated) as ConvexHandler<
      {
        clerkOrgId: string
        pagination: { page: number; pageSize: number }
        filters?: { payments?: string[] }
      },
      { items: unknown[]; totalCount: number; filterOptions: { clients: string[] } }
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      pagination: { page: 1, pageSize: 10 },
      filters: { payments: ["Espèce"] },
    })

    expect(result.totalCount).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.filterOptions.clients).toEqual(["Client A"])
  })

  it("removes a sale, restores stock, and writes a movement", async () => {
    const ctx = buildContext()

    const handler = getHandler(remove) as ConvexHandler<{ clerkOrgId: string; id: string }>

    await handler(ctx, { clerkOrgId: "org-1", id: "sale-1" })

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({
        stockQuantity: 6,
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "stockMovements",
      expect.objectContaining({
        productId: "product-1",
        delta: 1,
        movementType: "SALE_STOCK_SYNC",
        reason: "Suppression de vente",
        sourceId: "sale-1",
      })
    )
    expect(ctx.db.delete).toHaveBeenCalledWith("item-1")
    expect(ctx.db.delete).toHaveBeenCalledWith("sale-1")
  })

  it("restores lot quantities when reversing a sale", async () => {
    const ctx = buildContext({
      stockLots: [
        {
          _id: "lot-1",
          pharmacyId: "pharmacy-1",
          productId: "product-1",
          lotNumber: "LOT-001",
          expiryDate: Date.parse("2030-01-01"),
          quantity: 0,
        },
      ],
      saleItemLots: [
        {
          _id: "sale-lot-1",
          saleId: "sale-1",
          saleItemId: "item-1",
          productId: "product-1",
          lotNumber: "LOT-001",
          expiryDate: Date.parse("2030-01-01"),
          quantity: 1,
        },
      ],
    })

    const handler = getHandler(remove) as ConvexHandler<{ clerkOrgId: string; id: string }>
    await handler(ctx, { clerkOrgId: "org-1", id: "sale-1" })

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "lot-1",
      expect.objectContaining({
        quantity: 1,
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "stockMovements",
      expect.objectContaining({
        productId: "product-1",
        delta: 1,
        lotNumber: "LOT-001",
      })
    )
  })

  it("updates a sale, applies stock delta, and replaces its items", async () => {
    const ctx = buildContext()

    const handler = getHandler(update) as ConvexHandler<{
      clerkOrgId: string
      id: string
      clientId?: string
      paymentMethod: string
      globalDiscountType?: string
      globalDiscountValue?: number
      totalAmountHt: number
      totalAmountTtc: number
      items: Array<{
        productId: string
        productNameSnapshot: string
        quantity: number
        unitPriceHt: number
        vatRate: number
        lineDiscountType?: string
        lineDiscountValue?: number
        totalLineTtc: number
      }>
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      id: "sale-1",
      clientId: "client-1",
      paymentMethod: "CARD",
      globalDiscountType: "PERCENT",
      globalDiscountValue: 5,
      totalAmountHt: 200,
      totalAmountTtc: 210,
      items: [
        {
          productId: "product-2",
          productNameSnapshot: "Produit B",
          quantity: 2,
          unitPriceHt: 100,
          vatRate: 10,
          lineDiscountType: "AMOUNT",
          lineDiscountValue: 10,
          totalLineTtc: 210,
        },
      ],
    })

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "sale-1",
      expect.objectContaining({
        paymentMethod: "CARD",
        totalAmountHt: 200,
        totalAmountTtc: 210,
      })
    )
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({
        stockQuantity: 6,
      })
    )
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "product-2",
      expect.objectContaining({
        stockQuantity: 8,
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "stockMovements",
      expect.objectContaining({
        productId: "product-1",
        delta: 1,
        movementType: "SALE_STOCK_SYNC",
        reason: "Annulation avant mise à jour de vente",
        sourceId: "sale-1",
      })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "stockMovements",
      expect.objectContaining({
        productId: "product-2",
        delta: -2,
        movementType: "SALE_STOCK_SYNC",
        reason: "Mise à jour de vente",
        sourceId: "sale-1",
      })
    )
    expect(ctx.db.delete).toHaveBeenCalledWith("item-1")
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "saleItems",
      expect.objectContaining({ saleId: "sale-1", productId: "product-2" })
    )
  })
})

type BuildContextOptions = {
  existingUser?: { _id: string } | null
  productStocks?: Record<string, number>
  stockLots?: Array<{
    _id: string
    pharmacyId: string
    productId: string
    lotNumber: string
    expiryDate: number
    quantity: number
  }>
  saleItemLots?: Array<{
    _id: string
    saleId: string
    saleItemId: string
    productId: string
    lotNumber: string
    expiryDate: number
    quantity: number
  }>
}

function buildContext(options: BuildContextOptions = {}) {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }
  const sale = {
    _id: "sale-1",
    pharmacyId: "pharmacy-1",
    clientId: "client-1",
    sellerId: "seller-1",
    saleNumber: "FAC-01",
    saleSequence: 1,
    saleDate: 1700000000000,
    paymentMethod: "CASH",
  }
  const saleItem = {
    _id: "item-1",
    saleId: "sale-1",
    pharmacyId: "pharmacy-1",
    productId: "product-1",
    productNameSnapshot: "Produit A",
    quantity: 1,
    unitPriceHt: 100,
    vatRate: 10,
    totalLineTtc: 110,
  }
  const client = {
    _id: "client-1",
    pharmacyId: "pharmacy-1",
    name: "Client A",
  }
  const seller = {
    _id: "seller-1",
    name: "Seller",
  }
  const existingUser =
    options.existingUser === undefined ? { _id: "seller-1" } : options.existingUser
  const productStocks = options.productStocks ?? {}
  const productsById: Record<
    string,
    { _id: string; pharmacyId: string; name: string; stockQuantity: number }
  > = {
    "product-1": {
      _id: "product-1",
      pharmacyId: "pharmacy-1",
      name: "Produit A",
      stockQuantity: productStocks["product-1"] ?? 5,
    },
    "product-2": {
      _id: "product-2",
      pharmacyId: "pharmacy-1",
      name: "Produit B",
      stockQuantity: productStocks["product-2"] ?? 10,
    },
  }
  const stockLotsById = new Map(
    (options.stockLots ?? []).map((lot) => [lot._id, { ...lot, updatedAt: 0 }])
  )
  const saleItemLots = options.saleItemLots ?? []
  let saleItemInsertCount = 0

  const db = {
    query: vi.fn((table: string) => {
      if (table === "pharmacies") {
        return {
          withIndex: () => ({
            unique: async () => pharmacy,
          }),
        }
      }
      if (table === "sales") {
        return {
          withIndex: () => ({
            collect: async () => [sale],
          }),
        }
      }
      if (table === "saleItems") {
        return {
          withIndex: () => ({
            collect: async () => [saleItem],
          }),
        }
      }
      if (table === "saleItemLots") {
        return {
          withIndex: () => ({
            collect: async () => saleItemLots,
          }),
        }
      }
      if (table === "stockLots") {
        return {
          withIndex: () => ({
            collect: async () => Array.from(stockLotsById.values()),
          }),
        }
      }
      if (table === "clients") {
        return {
          withIndex: () => ({
            collect: async () => [client],
          }),
        }
      }
      if (table === "users") {
        return {
          withIndex: () => ({
            unique: async () => existingUser,
          }),
          collect: async () => [seller],
        }
      }
      return {
        withIndex: () => ({
          unique: async () => null,
          collect: async () => [],
        }),
      }
    }),
    get: vi.fn(async (id: string) => {
      if (id === "client-1") {
        return { _id: "client-1", name: "Client A" }
      }
      if (id === "seller-1") {
        return { _id: "seller-1", name: "Seller" }
      }
      if (id === "sale-1") {
        return sale
      }
      if (id in productsById) {
        return productsById[id]
      }
      return null
    }),
    insert: vi.fn(async (table: string) => {
      if (table === "users") {
        return "seller-1"
      }
      if (table === "sales") {
        return "sale-1"
      }
      if (table === "saleItems") {
        saleItemInsertCount += 1
        return `item-created-${saleItemInsertCount}`
      }
      if (table === "stockMovements") {
        return "movement-1"
      }
      if (table === "saleItemLots") {
        return "sale-item-lot-1"
      }
      return "id-1"
    }),
    delete: vi.fn(async () => {}),
    patch: vi.fn(async (id: string, value: { stockQuantity?: number }) => {
      if (id in productsById && typeof value.stockQuantity === "number") {
        productsById[id].stockQuantity = value.stockQuantity
      }
      if (stockLotsById.has(id) && typeof (value as { quantity?: number }).quantity === "number") {
        const lot = stockLotsById.get(id)
        if (!lot) return
        stockLotsById.set(id, {
          ...lot,
          quantity: (value as { quantity: number }).quantity,
        })
      }
    }),
  }

  return {
    auth: {
      getUserIdentity: vi
        .fn()
        .mockResolvedValue({ orgId: "org-1", subject: "user-1", name: "Seller" }),
    },
    db,
  }
}
