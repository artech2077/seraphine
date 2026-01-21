import { render, screen } from "@testing-library/react"

import { DashboardPage, type DashboardData } from "@/features/dashboard/dashboard-page"

const emptyData: DashboardData = {
  sales: { revenue: 0, transactions: 0, trend: 0 },
  cash: { status: "Fermée", floatAmount: 0 },
  stockAlerts: { total: 0, ruptures: 0, lowStock: 0 },
  orders: { pending: 0, delivered: 0 },
  trendData: { "7J": [], "30J": [], TRIM: [] },
  stockItems: [],
  recentSales: [],
  recentOrders: [],
}

describe("DashboardPage", () => {
  it("shows empty states when no data", () => {
    render(<DashboardPage data={emptyData} isLoading={false} />)

    expect(screen.getByText("Aucune tendance disponible")).toBeInTheDocument()
    expect(screen.getByText("Aucune alerte stock")).toBeInTheDocument()
    expect(screen.getByText("Aucune vente récente")).toBeInTheDocument()
    expect(screen.getByText("Aucune commande récente")).toBeInTheDocument()
  })
})
