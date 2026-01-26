"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useConvex, useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { ReconciliationDay } from "@/features/reconciliation/reconciliation-dashboard"
import type { ReconciliationHistoryItem } from "@/features/reconciliation/reconciliation-history-table"

type CashReconciliationRecord = {
  _id: string
  cashNumber?: string
  cashSequence?: number
  date: string
  opening: number
  openingLocked: boolean
  sales: number
  withdrawals: number
  adjustments: number
  actual: number
  isLocked: boolean
  createdAt?: number
}

type ReconciliationListFilters = {
  from?: number
  to?: number
  status?: string
}

type ReconciliationListOptions = {
  page?: number
  pageSize?: number
  filters?: ReconciliationListFilters
}

type ReconciliationListResponse = {
  items: CashReconciliationRecord[]
  totalCount: number
  fallbackNumbers: Record<string, string>
}

const CASH_PREFIX = "CASH-"

function formatCashNumber(sequence: number) {
  return `${CASH_PREFIX}${String(sequence).padStart(2, "0")}`
}

function parseCashNumber(value?: string | null) {
  if (!value) return null
  const match = value.match(/^CASH-(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

function mapDay(record: CashReconciliationRecord, fallbackNumber?: string): ReconciliationDay {
  const cashNumber =
    record.cashNumber ??
    (record.cashSequence ? formatCashNumber(record.cashSequence) : undefined) ??
    fallbackNumber ??
    record._id
  return {
    id: cashNumber,
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

function mapHistory(
  record: CashReconciliationRecord,
  fallbackNumber?: string
): ReconciliationHistoryItem {
  const expected = record.opening + record.sales - record.withdrawals + record.adjustments
  const cashNumber =
    record.cashNumber ??
    (record.cashSequence ? formatCashNumber(record.cashSequence) : undefined) ??
    fallbackNumber ??
    record._id
  return {
    id: cashNumber,
    date: record.date,
    opening: record.opening,
    expected,
    counted: record.actual,
  }
}

export function useReconciliationData() {
  const { orgId } = useAuth()

  const records = useQuery(api.reconciliation.listByOrg, orgId ? { clerkOrgId: orgId } : "skip") as
    | CashReconciliationRecord[]
    | undefined

  const upsertMutation = useMutation(api.reconciliation.upsertDay)

  const { days, history } = React.useMemo(() => {
    if (!records) {
      return { days: [], history: [] }
    }

    const usedSequences = new Set<number>()
    records.forEach((record) => {
      const sequence = record.cashSequence ?? parseCashNumber(record.cashNumber)
      if (sequence) {
        usedSequences.add(sequence)
      }
    })

    const fallbackNumbers = new Map<string, string>()
    const missing = [...records]
      .filter((record) => !record.cashNumber && !record.cashSequence)
      .sort((a, b) => {
        const dateA = a.createdAt ?? Date.parse(a.date)
        const dateB = b.createdAt ?? Date.parse(b.date)
        return dateA - dateB
      })

    let nextSequence = 1
    missing.forEach((record) => {
      while (usedSequences.has(nextSequence)) {
        nextSequence += 1
      }
      fallbackNumbers.set(record._id, formatCashNumber(nextSequence))
      usedSequences.add(nextSequence)
      nextSequence += 1
    })

    return {
      days: records.map((record) => mapDay(record, fallbackNumbers.get(record._id))),
      history: records.map((record) => mapHistory(record, fallbackNumbers.get(record._id))),
    }
  }, [records])

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

export function useReconciliationHistory(options?: ReconciliationListOptions) {
  const { orgId } = useAuth()
  const convex = useConvex()
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 10

  const listFilters = React.useMemo(
    () => ({
      from: options?.filters?.from,
      to: options?.filters?.to,
      status: options?.filters?.status,
    }),
    [options?.filters?.from, options?.filters?.status, options?.filters?.to]
  )

  const pagedResponse = useQuery(
    api.reconciliation.listByOrgPaginated,
    orgId ? { clerkOrgId: orgId, pagination: { page, pageSize }, filters: listFilters } : "skip"
  ) as ReconciliationListResponse | undefined

  const pagedItems = pagedResponse?.items
  const pagedFallbackNumbers = pagedResponse?.fallbackNumbers

  const items = React.useMemo(() => {
    if (!pagedItems) return []
    const fallbackNumbers = new Map(Object.entries(pagedFallbackNumbers ?? {}))
    return pagedItems.map((record) => mapHistory(record, fallbackNumbers.get(record._id)))
  }, [pagedItems, pagedFallbackNumbers])

  const exportHistory = React.useCallback(async () => {
    if (!orgId) return []
    const exportCount = pagedResponse?.totalCount ?? 0
    if (!exportCount) return []
    const response = (await convex.query(api.reconciliation.listByOrgPaginated, {
      clerkOrgId: orgId,
      pagination: { page: 1, pageSize: exportCount },
      filters: listFilters,
    })) as ReconciliationListResponse
    const fallbackNumbers = new Map(Object.entries(response.fallbackNumbers ?? {}))
    return response.items.map((record) => mapHistory(record, fallbackNumbers.get(record._id)))
  }, [convex, listFilters, orgId, pagedResponse?.totalCount])

  return {
    items,
    isLoading: pagedResponse === undefined,
    totalCount: pagedResponse?.totalCount ?? 0,
    exportHistory,
  }
}
