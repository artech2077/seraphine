import { vi } from "vitest"

import { create, listByOrg, remove, update } from "@/convex/clients"

type ConvexHandler<Args, Result = unknown> = (ctx: unknown, args: Args) => Promise<Result>

describe("convex/clients", () => {
  it("lists clients for the org", async () => {
    const ctx = buildContext()

    const handler = listByOrg as unknown as ConvexHandler<{ clerkOrgId: string }, unknown[]>

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

    const handler = create as unknown as ConvexHandler<{
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
        name: "Client A",
        creditLimit: 200,
      })
    )
  })

  it("updates clients", async () => {
    const ctx = buildContext()

    const handler = update as unknown as ConvexHandler<{
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

    const handler = remove as unknown as ConvexHandler<{ clerkOrgId: string; id: string }>

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
