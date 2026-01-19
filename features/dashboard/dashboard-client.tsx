"use client"

import { DashboardPage } from "@/features/dashboard/dashboard-page"
import { useDashboardData } from "@/features/dashboard/api"

export function DashboardClient() {
  const { data, isLoading } = useDashboardData()
  return <DashboardPage data={data} isLoading={isLoading} />
}
