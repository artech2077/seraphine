"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"
import { useStableQuery } from "@/hooks/use-stable-query"

export type LowStockSummary = {
  count: number
  signature: string
  hasActiveDraft: boolean
  activeOrderId?: string
  lastSyncedSignature?: string
  isHandled: boolean
}

export function useLowStockAlertSummary() {
  const { orgId } = useAuth()

  const summaryQuery = useStableQuery(
    api.alerts.lowStockSummary,
    orgId ? { clerkOrgId: orgId } : "skip"
  ) as { data: LowStockSummary | null | undefined; isLoading: boolean; isFetching: boolean }

  return {
    summary: summaryQuery.data ?? null,
    isLoading: summaryQuery.isLoading,
    isFetching: summaryQuery.isFetching,
  }
}

export function useLowStockAlertActions() {
  const { orgId } = useAuth()
  const createDraftMutation = useMutation(api.alerts.createLowStockDraft)
  const syncDraftMutation = useMutation(api.alerts.syncLowStockDraft)

  const createLowStockDraft = React.useCallback(
    async (supplierId: string) => {
      if (!orgId) return null
      return await createDraftMutation({ clerkOrgId: orgId, supplierId })
    },
    [createDraftMutation, orgId]
  )

  const syncLowStockDraft = React.useCallback(
    async (orderId: string) => {
      if (!orgId) return null
      return await syncDraftMutation({ clerkOrgId: orgId, orderId })
    },
    [orgId, syncDraftMutation]
  )

  return { createLowStockDraft, syncLowStockDraft }
}
