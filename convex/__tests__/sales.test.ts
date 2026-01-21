import { vi } from "vitest"

import { create, listByOrg, remove } from "@/convex/sales"

type ConvexHandler<Args, Result = unknown> = (ctx: unknown, args: Args) => Promise<Result>

describe("convex/sales", () => {
  it("returns sales for the org", async () => {
    const ctx = buildContext()

    const handler = listByOrg as unknown as ConvexHandler<{ clerkOrgId: string }, unknown[]>

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

  it("creates sale, user, and line items", async () => {
    const ctx = buildContext({ existingUser: null })

    const handler = create as unknown as ConvexHandler<{
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
      expect.objectContaining({ pharmacyId: "pharmacy-1" })
    )
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "saleItems",
      expect.objectContaining({ productId: "product-1" })
    )
  })

  it("removes a sale and its items", async () => {
    const ctx = buildContext()

    const handler = remove as unknown as ConvexHandler<{ clerkOrgId: string; id: string }>

    await handler(ctx, { clerkOrgId: "org-1", id: "sale-1" })

    expect(ctx.db.delete).toHaveBeenCalledWith("item-1")
    expect(ctx.db.delete).toHaveBeenCalledWith("sale-1")
  })
})

type BuildContextOptions = {
  existingUser?: { _id: string } | null
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
  }
  const item = {
    _id: "item-1",
    saleId: "sale-1",
  }
  const existingUser =
    options.existingUser === undefined ? { _id: "seller-1" } : options.existingUser

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
            collect: async () => [item],
          }),
        }
      }
      if (table === "users") {
        return {
          withIndex: () => ({
            unique: async () => existingUser,
          }),
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
      return null
    }),
    insert: vi.fn(async (table: string) => {
      if (table === "users") {
        return "seller-1"
      }
      if (table === "sales") {
        return "sale-1"
      }
      return "item-1"
    }),
    delete: vi.fn(async () => {}),
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
