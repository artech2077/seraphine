"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"

import { api } from "@/convex/_generated/api"
import type { DashboardData } from "@/features/dashboard/dashboard-page"
import { useStableQuery } from "@/hooks/use-stable-query"

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

export function useDashboardData(now: number | null) {
  const { orgId } = useAuth()
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    setHydrated(true)
  }, [])

  const hasNow = typeof now === "number"
  const summaryQuery = useStableQuery(
    api.dashboard.getSummary,
    hydrated && orgId && hasNow ? { clerkOrgId: orgId, now } : "skip"
  ) as {
    data: Partial<DashboardData> | null | undefined
    isLoading: boolean
    isFetching: boolean
  }
  const summary = summaryQuery.data

  return {
    data: summary ? { ...emptyData, ...summary } : emptyData,
    isLoading: !hydrated || !hasNow || summaryQuery.isLoading,
    isFetching: summaryQuery.isFetching,
  }
}
