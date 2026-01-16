"use client"

import * as React from "react"

import { PageShell } from "@/components/layout/page-shell"
import {
  ReconciliationDashboard,
  type ReconciliationDay,
} from "@/features/reconciliation/reconciliation-dashboard"
import { ReconciliationHistoryPanel } from "@/features/reconciliation/reconciliation-history-panel"
import type { ReconciliationHistoryItem } from "@/features/reconciliation/reconciliation-history-table"

export type ReconciliationPageProps = {
  days: ReconciliationDay[]
  history: ReconciliationHistoryItem[]
}

export function ReconciliationPage({ days, history }: ReconciliationPageProps) {
  return (
    <PageShell
      title="Réconciliation de caisse"
      description="Suivez l'ouverture, la fermeture et les écarts journaliers."
    >
      <div className="flex flex-col gap-4">
        <ReconciliationDashboard days={days} />
        <ReconciliationHistoryPanel items={history} />
      </div>
    </PageShell>
  )
}
