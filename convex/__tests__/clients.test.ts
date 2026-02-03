import { vi } from "vitest"

import { create, listByOrg, listByOrgPaginated, remove, update } from "@/convex/clients"
import { getHandler, type ConvexHandler } from "@/convex/__tests__/test_utils"

describe("convex/clients", () => {
  it("lists clients for the org", async () => {
    const ctx = buildContext()

    const handler = getHandler(listByOrg) as ConvexHandler<{ clerkOrgId: string }, unknown[]>

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toEqual([
      expect.objectContaining({
        _id: "client-1",
        name: "Client A",
        accountStatus: "OK",
      }),
    ])
  })

  it("creates clients", async () => {
    const ctx = buildContext()

    const handler = getHandler(create) as ConvexHandler<{
      clerkOrgId: string
      name: string
      phone: string
      city: string
      creditLimit: number
      outstandingBalance: number
      accountStatus: string
      internalNotes: string
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      name: "Client A",
      phone: "0600000000",
      city: "Rabat",
      creditLimit: 200,
      outstandingBalance: 50,
      accountStatus: "SURVEILLE",
      internalNotes: "Note",
    })

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "clients",
      expect.objectContaining({
        pharmacyId: "pharmacy-1",
        clientNumber: "CLI-02",
        clientSequence: 2,
        name: "Client A",
        creditLimit: 200,
      })
    )
  })

  it("paginates clients for the org", async () => {
    const ctx = buildContext()

    const handler = getHandler(listByOrgPaginated) as ConvexHandler<
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
      filters: { names: ["Client A"] },
    })

    expect(result.totalCount).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.filterOptions.names).toEqual(["Client A"])
  })

  it("updates clients", async () => {
    const ctx = buildContext()

    const handler = getHandler(update) as ConvexHandler<{
      clerkOrgId: string
      id: string
      name: string
      phone: string
      city: string
      creditLimit: number
      outstandingBalance: number
      accountStatus: string
      internalNotes: string
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      id: "client-1",
      name: "Client B",
      phone: "0700000000",
      city: "Rabat",
      creditLimit: 100,
      outstandingBalance: 20,
      accountStatus: "OK",
      internalNotes: "Note",
    })

    expect(ctx.db.patch).toHaveBeenCalledWith("client-1", {
      name: "Client B",
      phone: "0700000000",
      city: "Rabat",
      creditLimit: 100,
      outstandingBalance: 20,
      accountStatus: "OK",
      internalNotes: "Note",
    })
  })

  it("removes clients", async () => {
    const ctx = buildContext()

    const handler = getHandler(remove) as ConvexHandler<{ clerkOrgId: string; id: string }>

    await handler(ctx, { clerkOrgId: "org-1", id: "client-1" })

    expect(ctx.db.delete).toHaveBeenCalledWith("client-1")
  })
})

function buildContext() {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }
  const client = {
    _id: "client-1",
    pharmacyId: "pharmacy-1",
    clientNumber: "CLI-01",
    clientSequence: 1,
    name: "Client A",
    accountStatus: "OK",
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
      if (table === "clients") {
        return {
          withIndex: () => ({
            collect: async () => [client],
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
    get: vi.fn(async () => client),
    insert: vi.fn(async () => "client-1"),
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
