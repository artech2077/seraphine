"use client"

import * as React from "react"

import { PageShell } from "@/components/layout/page-shell"
import { ReconciliationDashboard } from "@/features/reconciliation/reconciliation-dashboard"
import { ReconciliationHistoryPanel } from "@/features/reconciliation/reconciliation-history-panel"
import { useReconciliationData } from "@/features/reconciliation/api"

export function ReconciliationPage() {
  const { days, history, upsertDay, isLoading } = useReconciliationData()
  return (
    <PageShell
      title="Réconciliation de caisse"
      description="Suivez l'ouverture, la fermeture et les écarts journaliers."
    >
      <div className="flex flex-col gap-4">
        <ReconciliationDashboard days={days} isLoading={isLoading} onUpdateDay={upsertDay} />
        <ReconciliationHistoryPanel items={history} isLoading={isLoading} />
      </div>
    </PageShell>
  )
}
