"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { DashboardData } from "@/features/dashboard/dashboard-page"

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

export function useDashboardData() {
  const { isLoaded, orgId, userId } = useAuth()
  const { organization } = useOrganization()
  const ensurePharmacy = useMutation(api.pharmacies.ensureForOrg)
  const orgName = organization?.name ?? "Pharmacie"

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])

  const summary = useQuery(api.dashboard.getSummary, orgId ? { clerkOrgId: orgId } : "skip") as
    | Partial<DashboardData>
    | null
    | undefined

  return {
    data: summary ? { ...emptyData, ...summary } : emptyData,
    isLoading: summary === undefined,
  }
}
