"use client"

import * as React from "react"

import { DashboardPage } from "@/features/dashboard/dashboard-page"
import { useDashboardData } from "@/features/dashboard/api"

type DashboardClientProps = {
  now?: number
}

export function DashboardClient({ now }: DashboardClientProps) {
  const [resolvedNow, setResolvedNow] = React.useState<number | null>(now ?? null)

  React.useEffect(() => {
    if (now !== undefined) {
      setResolvedNow(now)
      return
    }
    setResolvedNow(Date.now())
  }, [now])

  const { data, isLoading } = useDashboardData(resolvedNow)
  return <DashboardPage data={data} isLoading={isLoading} />
}
