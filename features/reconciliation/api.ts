"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { ReconciliationDay } from "@/features/reconciliation/reconciliation-dashboard"
import type { ReconciliationHistoryItem } from "@/features/reconciliation/reconciliation-history-table"

type CashReconciliationRecord = {
  _id: string
  date: string
  opening: number
  openingLocked: boolean
  sales: number
  withdrawals: number
  adjustments: number
  actual: number
  isLocked: boolean
}

function mapDay(record: CashReconciliationRecord): ReconciliationDay {
  return {
    id: record._id,
    date: record.date,
    opening: record.opening,
    openingLocked: record.openingLocked,
    sales: record.sales,
    withdrawals: record.withdrawals,
    adjustments: record.adjustments,
    actual: record.actual,
    isLocked: record.isLocked,
  }
}

function mapHistory(record: CashReconciliationRecord): ReconciliationHistoryItem {
  const expected = record.opening + record.sales - record.withdrawals + record.adjustments
  return {
    id: record._id,
    date: record.date,
    opening: record.opening,
    expected,
    counted: record.actual,
  }
}

export function useReconciliationData() {
  const { isLoaded, orgId, userId } = useAuth()
  const { organization } = useOrganization()
  const ensurePharmacy = useMutation(api.pharmacies.ensureForOrg)
  const orgName = organization?.name ?? "Pharmacie"

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])

  const records = useQuery(api.reconciliation.listByOrg, orgId ? { clerkOrgId: orgId } : "skip") as
    | CashReconciliationRecord[]
    | undefined

  const upsertMutation = useMutation(api.reconciliation.upsertDay)

  const days = React.useMemo(() => (records ? records.map(mapDay) : []), [records])
  const history = React.useMemo(() => (records ? records.map(mapHistory) : []), [records])

  async function upsertDay(day: ReconciliationDay) {
    if (!orgId) return
    await upsertMutation({
      clerkOrgId: orgId,
      date: day.date,
      opening: day.opening ?? 0,
      openingLocked: day.openingLocked,
      sales: day.sales,
      withdrawals: day.withdrawals,
      adjustments: day.adjustments,
      actual: day.actual ?? 0,
      isLocked: day.isLocked,
    })
  }

  return {
    days,
    history,
    isLoading: records === undefined,
    upsertDay,
  }
}
