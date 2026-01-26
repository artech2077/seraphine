import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useDashboardData } from "@/features/dashboard/api"
import { mockClerkAuth } from "@/tests/mocks/clerk"

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}))

const { useAuth } = await import("@clerk/nextjs")
const { useQuery } = await import("convex/react")

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
  })

  it("merges summary data with defaults", async () => {
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

    const { result } = renderHook(() => useDashboardData(123))

    await waitFor(() => {
      expect(result.current.data.sales.revenue).toBe(1500)
      expect(result.current.data.cash.status).toBe("Ouverte")
    })
  })
})
