import { vi } from "vitest"

import { create, listByOrg, listByOrgPaginated, remove, update } from "@/convex/suppliers"

type ConvexHandler<Args, Result = unknown> = (ctx: unknown, args: Args) => Promise<Result>

describe("convex/suppliers", () => {
  it("lists suppliers for the org", async () => {
    const ctx = buildContext()

    const handler = listByOrg as unknown as ConvexHandler<{ clerkOrgId: string }, unknown[]>

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toEqual([
      expect.objectContaining({
        _id: "supplier-1",
        name: "Fournisseur A",
      }),
    ])
  })

  it("creates suppliers", async () => {
    const ctx = buildContext()

    const handler = create as unknown as ConvexHandler<{
      clerkOrgId: string
      name: string
      email: string
      phone: string
      city: string
      balance: number
      internalNotes: string
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      name: "Fournisseur A",
      email: "contact@example.com",
      phone: "0600000000",
      city: "Rabat",
      balance: 100,
      internalNotes: "Note",
    })

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "suppliers",
      expect.objectContaining({
        pharmacyId: "pharmacy-1",
        supplierNumber: "FOUR-02",
        supplierSequence: 2,
        name: "Fournisseur A",
        balance: 100,
      })
    )
  })

  it("paginates suppliers for the org", async () => {
    const ctx = buildContext()

    const handler = listByOrgPaginated as unknown as ConvexHandler<
      {
        clerkOrgId: string
        pagination: { page: number; pageSize: number }
        filters?: { names?: string[] }
      },
      { items: unknown[]; totalCount: number; filterOptions: { names: string[]; cities: string[] } }
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      pagination: { page: 1, pageSize: 10 },
      filters: { names: ["Fournisseur A"] },
    })

    expect(result.totalCount).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.filterOptions.names).toEqual(["Fournisseur A"])
  })

  it("updates suppliers", async () => {
    const ctx = buildContext()

    const handler = update as unknown as ConvexHandler<{
      clerkOrgId: string
      id: string
      name: string
      email: string
      phone: string
      city: string
      balance: number
      internalNotes: string
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      id: "supplier-1",
      name: "Fournisseur B",
      email: "new@example.com",
      phone: "0700000000",
      city: "Rabat",
      balance: 50,
      internalNotes: "Note",
    })

    expect(ctx.db.patch).toHaveBeenCalledWith("supplier-1", {
      name: "Fournisseur B",
      email: "new@example.com",
      phone: "0700000000",
      city: "Rabat",
      balance: 50,
      internalNotes: "Note",
    })
  })

  it("removes suppliers", async () => {
    const ctx = buildContext()

    const handler = remove as unknown as ConvexHandler<{ clerkOrgId: string; id: string }>

    await handler(ctx, { clerkOrgId: "org-1", id: "supplier-1" })

    expect(ctx.db.delete).toHaveBeenCalledWith("supplier-1")
  })
})

function buildContext() {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }
  const supplier = {
    _id: "supplier-1",
    pharmacyId: "pharmacy-1",
    supplierNumber: "FOUR-01",
    supplierSequence: 1,
    name: "Fournisseur A",
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
      if (table === "suppliers") {
        return {
          withIndex: () => ({
            collect: async () => [supplier],
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
    get: vi.fn(async () => supplier),
    insert: vi.fn(async () => "supplier-1"),
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
