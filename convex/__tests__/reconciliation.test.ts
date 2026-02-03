import { vi } from "vitest"

import { listByOrg, listByOrgPaginated, upsertDay } from "@/convex/reconciliation"
import { getHandler, type ConvexHandler } from "@/convex/__tests__/test_utils"

describe("convex/reconciliation", () => {
  it("lists reconciliation records for the org", async () => {
    const ctx = buildContext()

    const handler = getHandler(listByOrg) as ConvexHandler<{ clerkOrgId: string }, unknown[]>

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

    const handler = getHandler(upsertDay) as ConvexHandler<{
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

    expect(ctx.mocks.cashReconciliationsIndex).toHaveBeenCalledWith(
      "by_pharmacyId_date",
      expect.any(Function)
    )
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

    const handler = getHandler(upsertDay) as ConvexHandler<{
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

    const handler = getHandler(listByOrgPaginated) as ConvexHandler<
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
  const cashReconciliationsIndex = vi.fn((indexName: string) => {
    if (indexName === "by_pharmacyId_date") {
      return {
        unique: async () => (options.existingDay ? day : null),
      }
    }
    return {
      collect: async () => [day],
    }
  })

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
          withIndex: cashReconciliationsIndex,
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
    mocks: {
      cashReconciliationsIndex,
    },
  }
}
