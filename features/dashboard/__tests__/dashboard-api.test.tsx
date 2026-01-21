import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useDashboardData } from "@/features/dashboard/api"
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

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useOrganization).mockReturnValue(mockOrganization({ name: "Pharmacie" }))
  })

  it("merges summary data with defaults", async () => {
    const ensurePharmacy = createMockMutation()

    vi.mocked(useMutation).mockImplementationOnce(() => ensurePharmacy)

    vi.mocked(useQuery).mockReturnValue({
      sales: { revenue: 1500, transactions: 12, trend: 10 },
      cash: { status: "Ouverte", floatAmount: 300 },
      stockAlerts: { total: 2, ruptures: 1, lowStock: 1 },
      orders: { pending: 1, delivered: 2 },
      trendData: { "7J": [], "30J": [], TRIM: [] },
      stockItems: [],
      recentSales: [],
      recentOrders: [],
    })

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledWith({ clerkOrgId: "org-1", name: "Pharmacie" })
    })

    expect(result.current.data.sales.revenue).toBe(1500)
    expect(result.current.data.cash.status).toBe("Ouverte")
  })
})
