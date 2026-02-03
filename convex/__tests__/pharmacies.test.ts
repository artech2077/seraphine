import { vi } from "vitest"

import { ensureForOrg } from "@/convex/pharmacies"
import { getHandler, type ConvexHandler } from "@/convex/__tests__/test_utils"

describe("convex/pharmacies", () => {
  it("returns existing pharmacy id", async () => {
    const ctx = buildContext({ existing: true })

    const handler = getHandler(ensureForOrg) as ConvexHandler<
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
    const ctx = buildContext({ existing: false, latestSequence: 1 })

    const handler = getHandler(ensureForOrg) as ConvexHandler<
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
        pharmacyNumber: "PHARM-02",
        pharmacySequence: 2,
      })
    )
    expect(ctx.db.query).toHaveBeenCalledWith("pharmacies")
  })
})

type BuildContextOptions = {
  existing: boolean
  latestSequence?: number | null
}

type PharmacyRow = {
  _id: string
  pharmacyNumber?: string
  pharmacySequence?: number
}

function buildContext(options: BuildContextOptions) {
  const existingPharmacies = options.existing
    ? [{ _id: "pharmacy-1", pharmacyNumber: "PHARM-01", pharmacySequence: 1 }]
    : []
  const latestSequence = options.latestSequence ?? null
  const db = {
    query: vi.fn(() => ({
      withIndex: (indexName: string) => {
        if (indexName === "by_clerkOrgId") {
          return {
            unique: async (): Promise<PharmacyRow | null> =>
              options.existing ? { _id: "pharmacy-1" } : null,
          }
        }
        if (indexName === "by_pharmacySequence") {
          return {
            order: () => ({
              first: async () =>
                latestSequence
                  ? {
                      pharmacySequence: latestSequence,
                      pharmacyNumber: `PHARM-${String(latestSequence).padStart(2, "0")}`,
                    }
                  : null,
            }),
          }
        }
        return {
          unique: async (): Promise<PharmacyRow | null> => null,
          order: () => ({ first: async () => null }),
        }
      },
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
