import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useReconciliationData, useReconciliationHistory } from "@/features/reconciliation/api"
import { mockClerkAuth, mockOrganization } from "@/tests/mocks/clerk"
import { createMockMutation } from "@/tests/mocks/convex"

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
  useOrganization: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
  useConvex: vi.fn(),
}))

const { useAuth, useOrganization } = await import("@clerk/nextjs")
const { useMutation, useQuery, useConvex } = await import("convex/react")

describe("useReconciliationData", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useConvex).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useOrganization).mockReturnValue(mockOrganization({ name: "Pharmacie" }))
    vi.mocked(useConvex).mockReturnValue({ query: vi.fn() })
  })

  it("maps reconciliation records into days and history", async () => {
    const ensurePharmacy = createMockMutation()
    const upsertMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => upsertMutation)

    const records = [
      {
        _id: "day-1",
        cashNumber: "CASH-01",
        cashSequence: 1,
        date: "2026-01-02",
        opening: 100,
        openingLocked: true,
        sales: 200,
        withdrawals: 20,
        adjustments: -10,
        actual: 260,
        isLocked: false,
      },
    ]

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : records))

    const { result } = renderHook(() => useReconciliationData())

    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledWith({ clerkOrgId: "org-1", name: "Pharmacie" })
    })

    expect(result.current.days[0]).toEqual(
      expect.objectContaining({
        id: "CASH-01",
        opening: 100,
        openingLocked: true,
        sales: 200,
        withdrawals: 20,
        adjustments: -10,
        actual: 260,
      })
    )

    expect(result.current.history[0]).toEqual(
      expect.objectContaining({
        id: "CASH-01",
        opening: 100,
        expected: 270,
        counted: 260,
      })
    )
  })

  it("upserts days with default opening values", async () => {
    const ensurePharmacy = createMockMutation()
    const upsertMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => upsertMutation)

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : []))

    const { result } = renderHook(() => useReconciliationData())

    await result.current.upsertDay({
      id: "day-2",
      date: "2026-01-03",
      opening: null,
      openingLocked: false,
      sales: 0,
      withdrawals: 0,
      adjustments: 0,
      actual: null,
      isLocked: false,
    })

    expect(upsertMutation).toHaveBeenCalledWith({
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
  })

  it("returns paginated reconciliation history metadata", async () => {
    const ensurePharmacy = createMockMutation()
    const upsertMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => upsertMutation)

    vi.mocked(useQuery).mockImplementation((_, args) => {
      if (args === "skip") return undefined
      return {
        items: [
          {
            _id: "day-2",
            cashNumber: "CASH-02",
            cashSequence: 2,
            date: "2026-01-03",
            opening: 100,
            openingLocked: true,
            sales: 200,
            withdrawals: 20,
            adjustments: 0,
            actual: 280,
            isLocked: true,
          },
        ],
        totalCount: 4,
        fallbackNumbers: {},
      }
    })

    const { result } = renderHook(() =>
      useReconciliationHistory({ page: 1, pageSize: 5, filters: { status: "Validé" } })
    )

    expect(result.current.totalCount).toBe(4)
    expect(result.current.items[0].id).toBe("CASH-02")
  })
})
