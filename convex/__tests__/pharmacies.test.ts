import { vi } from "vitest"

import { ensureForOrg } from "@/convex/pharmacies"

type ConvexHandler<Args, Result = unknown> = (ctx: unknown, args: Args) => Promise<Result>

describe("convex/pharmacies", () => {
  it("returns existing pharmacy id", async () => {
    const ctx = buildContext({ existing: true })

    const handler = ensureForOrg as unknown as ConvexHandler<
      {
        clerkOrgId: string
        name: string
      },
      string
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      name: "Pharmacie",
    })

    expect(result).toBe("pharmacy-1")
    expect(ctx.db.insert).not.toHaveBeenCalled()
  })

  it("creates pharmacy when missing", async () => {
    const ctx = buildContext({ existing: false })

    const handler = ensureForOrg as unknown as ConvexHandler<
      {
        clerkOrgId: string
        name: string
      },
      string
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      name: "Pharmacie",
    })

    expect(result).toBe("pharmacy-1")
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "pharmacies",
      expect.objectContaining({
        clerkOrgId: "org-1",
        name: "Pharmacie",
        pharmacyNumber: "PHARM-01",
        pharmacySequence: 1,
      })
    )
  })
})

type BuildContextOptions = {
  existing: boolean
}

function buildContext(options: BuildContextOptions) {
  const existingPharmacies = options.existing
    ? [{ _id: "pharmacy-1", pharmacyNumber: "PHARM-01", pharmacySequence: 1 }]
    : []
  const db = {
    query: vi.fn(() => ({
      withIndex: () => ({
        unique: async () => (options.existing ? { _id: "pharmacy-1" } : null),
      }),
      collect: async () => existingPharmacies,
    })),
    insert: vi.fn(async () => "pharmacy-1"),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1" }),
    },
    db,
  }
}
