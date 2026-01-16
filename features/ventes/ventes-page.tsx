"use client"

import * as React from "react"

import { PageShell } from "@/components/layout/page-shell"
import { SalesHistoryPanel } from "@/features/ventes/sales-history-panel"
import { SalesPos } from "@/features/ventes/sales-pos"
import type { SaleHistoryItem } from "@/features/ventes/sales-history-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TAB_STORAGE_KEY = "ventes:last-tab"

type VentesPageProps = {
  salesHistory: SaleHistoryItem[]
}

export function VentesPage({ salesHistory }: VentesPageProps) {
  const [activeTab, setActiveTab] = React.useState<"pos" | "historique">("pos")

  React.useEffect(() => {
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY)
    if (stored === "pos" || stored === "historique") {
      setActiveTab(stored)
    }
  }, [])

  const handleTabChange = React.useCallback((value: string) => {
    if (value !== "pos" && value !== "historique") {
      return
    }
    setActiveTab(value)
    window.localStorage.setItem(TAB_STORAGE_KEY, value)
  }, [])

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <PageShell
        title="Ventes"
        description="Suivez vos transactions et la performance commerciale."
        tabs={
          <TabsList variant="line">
            <TabsTrigger value="pos">Point de vente</TabsTrigger>
            <TabsTrigger value="historique">Historique des ventes</TabsTrigger>
          </TabsList>
        }
      >
        <TabsContent value="pos">
          <SalesPos />
        </TabsContent>
        <TabsContent value="historique" className="space-y-4">
          <SalesHistoryPanel sales={salesHistory} />
        </TabsContent>
      </PageShell>
    </Tabs>
  )
}
