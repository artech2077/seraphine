import { vi } from "vitest"

import { listByOrg, listByOrgPaginated, upsertDay } from "@/convex/reconciliation"

type ConvexHandler<Args, Result = unknown> = (ctx: unknown, args: Args) => Promise<Result>

describe("convex/reconciliation", () => {
  it("lists reconciliation records for the org", async () => {
    const ctx = buildContext()

    const handler = listByOrg as unknown as ConvexHandler<{ clerkOrgId: string }, unknown[]>

    const result = await handler(ctx, { clerkOrgId: "org-1" })

    expect(result).toEqual([
      expect.objectContaining({
        _id: "day-1",
        date: "2026-01-02",
      }),
    ])
  })

  it("updates existing reconciliation records", async () => {
    const ctx = buildContext({ existingDay: true })

    const handler = upsertDay as unknown as ConvexHandler<{
      clerkOrgId: string
      date: string
      opening: number
      openingLocked: boolean
      sales: number
      withdrawals: number
      adjustments: number
      actual: number
      isLocked: boolean
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      date: "2026-01-02",
      opening: 100,
      openingLocked: true,
      sales: 200,
      withdrawals: 10,
      adjustments: 0,
      actual: 290,
      isLocked: true,
    })

    expect(ctx.db.patch).toHaveBeenCalledWith("day-1", {
      opening: 100,
      openingLocked: true,
      sales: 200,
      withdrawals: 10,
      adjustments: 0,
      actual: 290,
      isLocked: true,
    })
  })

  it("creates new reconciliation records", async () => {
    const ctx = buildContext({ existingDay: false })

    const handler = upsertDay as unknown as ConvexHandler<{
      clerkOrgId: string
      date: string
      opening: number
      openingLocked: boolean
      sales: number
      withdrawals: number
      adjustments: number
      actual: number
      isLocked: boolean
    }>

    await handler(ctx, {
      clerkOrgId: "org-1",
      date: "2026-01-03",
      opening: 0,
      openingLocked: false,
      sales: 0,
      withdrawals: 0,
      adjustments: 0,
      actual: 0,
      isLocked: false,
    })

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "cashReconciliations",
      expect.objectContaining({
        pharmacyId: "pharmacy-1",
        cashNumber: "CASH-02",
        cashSequence: 2,
        date: "2026-01-03",
        opening: 0,
      })
    )
  })

  it("paginates reconciliation history", async () => {
    const ctx = buildContext()

    const handler = listByOrgPaginated as unknown as ConvexHandler<
      {
        clerkOrgId: string
        pagination: { page: number; pageSize: number }
        filters?: { status?: string }
      },
      { items: unknown[]; totalCount: number }
    >

    const result = await handler(ctx, {
      clerkOrgId: "org-1",
      pagination: { page: 1, pageSize: 10 },
      filters: { status: "Validé" },
    })

    expect(result.totalCount).toBe(1)
    expect(result.items).toHaveLength(1)
  })
})

type BuildContextOptions = {
  existingDay: boolean
}

function buildContext(options: BuildContextOptions = { existingDay: true }) {
  const pharmacy = {
    _id: "pharmacy-1",
    clerkOrgId: "org-1",
  }
  const day = {
    _id: "day-1",
    pharmacyId: "pharmacy-1",
    cashNumber: "CASH-01",
    cashSequence: 1,
    date: "2026-01-02",
    opening: 100,
    openingLocked: true,
    sales: 200,
    withdrawals: 20,
    adjustments: 0,
    actual: 280,
    isLocked: false,
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
      if (table === "cashReconciliations") {
        return {
          withIndex: () => ({
            collect: async () => [day],
            filter: () => ({
              unique: async () => (options.existingDay ? day : null),
            }),
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
    patch: vi.fn(async () => {}),
    insert: vi.fn(async () => "day-1"),
  }

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({ orgId: "org-1" }),
    },
    db,
  }
}
