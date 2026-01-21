import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useReconciliationData } from "@/features/reconciliation/api"
import { mockClerkAuth, mockOrganization } from "@/tests/mocks/clerk"
import { createMockMutation } from "@/tests/mocks/convex"

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
  useOrganization: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}))

const { useAuth, useOrganization } = await import("@clerk/nextjs")
const { useMutation, useQuery } = await import("convex/react")

describe("useReconciliationData", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useOrganization).mockReturnValue(mockOrganization({ name: "Pharmacie" }))
  })

  it("maps reconciliation records into days and history", async () => {
    const ensurePharmacy = createMockMutation()
    const upsertMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => upsertMutation)

    vi.mocked(useQuery).mockReturnValue([
      {
        _id: "day-1",
        date: "2026-01-02",
        opening: 100,
        openingLocked: true,
        sales: 200,
        withdrawals: 20,
        adjustments: -10,
        actual: 260,
        isLocked: false,
      },
    ])

    const { result } = renderHook(() => useReconciliationData())

    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledWith({ clerkOrgId: "org-1", name: "Pharmacie" })
    })

    expect(result.current.days[0]).toEqual(
      expect.objectContaining({
        id: "day-1",
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
        id: "day-1",
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

    vi.mocked(useQuery).mockReturnValue([])

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
})
