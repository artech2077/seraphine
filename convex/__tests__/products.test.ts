import { vi } from "vitest"

import { create, listByOrg, listByOrgPaginated, remove, update } from "@/convex/products"
import { getHandler, type ConvexHandler } from "@/convex/__tests__/test_utils"

describe("convex/products", () => {
  it("returns empty list when org mismatch", async () => {
    const ctx = {
      auth: {
        getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-2" }),
      },
      db: {
        query: vi.fn(),
      },
    }

    const handler = getHandler(listByOrg) as ConvexHandler<{ clerkOrgId: string }, unknown[]>

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toEqual([])
  })

  it("creates products for the pharmacy", async () => {
    const ctx = buildContext()

    const handler = getHandler(create) as ConvexHandler<{
      clerkOrgId: string
      name: string
      barcode: string
      category: string
      purchasePrice: number
      sellingPrice: number
      vatRate: number
      stockQuantity: number
      lowStockThreshold: number
      dosageForm: string
      internalNotes: string | undefined
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      name: "Doliprane",
      barcode: "123",
      category: "Medicaments",
      purchasePrice: 10,
      sellingPrice: 12,
      vatRate: 7,
      stockQuantity: 4,
      lowStockThreshold: 2,
      dosageForm: "Comprime",
      internalNotes: undefined,
    })

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "products",
      expect.objectContaining({
        pharmacyId: "pharmacy-1",
        name: "Doliprane",
        barcode: "123",
        category: "Medicaments",
        purchasePrice: 10,
        sellingPrice: 12,
        vatRate: 7,
        stockQuantity: 4,
        lowStockThreshold: 2,
        dosageForm: "Comprime",
        internalNotes: undefined,
      })
    )
  })

  it("paginates products for the org", async () => {
    const ctx = buildContext()

    const handler = getHandler(listByOrgPaginated) as ConvexHandler<
      {
        clerkOrgId: string
        pagination: { page: number; pageSize: number }
        filters?: { names?: string[] }
      },
      { items: unknown[]; totalCount: number; filterOptions: { names: string[] } }
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      pagination: { page: 1, pageSize: 10 },
      filters: { names: ["Doliprane"] },
    })

    expect(result.totalCount).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.filterOptions.names).toEqual(["Doliprane"])
  })

  it("updates products in the same pharmacy", async () => {
    const ctx = buildContext()

    const handler = getHandler(update) as ConvexHandler<{
      clerkOrgId: string
      id: string
      name: string
      barcode: string
      category: string
      purchasePrice: number
      sellingPrice: number
      vatRate: number
      stockQuantity: number
      lowStockThreshold: number
      dosageForm: string
      internalNotes: string
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      id: "product-1",
      name: "New Name",
      barcode: "456",
      category: "Medicaments",
      purchasePrice: 8,
      sellingPrice: 11,
      vatRate: 7,
      stockQuantity: 5,
      lowStockThreshold: 1,
      dosageForm: "Comprime",
      internalNotes: "note",
    })

    expect(ctx.db.patch).toHaveBeenCalledWith("product-1", {
      name: "New Name",
      barcode: "456",
      category: "Medicaments",
      purchasePrice: 8,
      sellingPrice: 11,
      vatRate: 7,
      stockQuantity: 5,
      lowStockThreshold: 1,
      dosageForm: "Comprime",
      internalNotes: "note",
    })
  })

  it("removes products in the same pharmacy", async () => {
    const ctx = buildContext()

    const handler = getHandler(remove) as ConvexHandler<{ clerkOrgId: string; id: string }>

    await handler(ctx, { clerkOrgId: "org-1", id: "product-1" })

    expect(ctx.db.delete).toHaveBeenCalledWith("product-1")
  })
})

function buildContext() {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }
  const product = {
    _id: "product-1",
    pharmacyId: "pharmacy-1",
    name: "Doliprane",
    barcode: "123",
    category: "Medicaments",
    purchasePrice: 10,
    sellingPrice: 12,
    vatRate: 7,
    stockQuantity: 4,
    lowStockThreshold: 2,
    dosageForm: "Comprime",
  }

  const db = {
    query: vi.fn((table: string) => {
      if (table === "pharmacies") {
        return {
          withIndex: () => ({
            unique: async () => pharmacy,
          }),
        }
      }
      if (table === "products") {
        return {
          withIndex: () => ({
            collect: async () => [product],
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
    get: vi.fn(async () => product),
    insert: vi.fn(async () => "product-1"),
    patch: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1" }),
    },
    db,
  }
}
