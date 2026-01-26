"use client"

import * as React from "react"

import { PageShell } from "@/components/layout/page-shell"
import { SalesHistoryPanel } from "@/features/ventes/sales-history-panel"
import { SalesPos } from "@/features/ventes/sales-pos"
import type { SaleHistoryItem } from "@/features/ventes/sales-history-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TAB_STORAGE_KEY = "ventes:last-tab"

export function VentesPage() {
  const [activeTab, setActiveTab] = React.useState<"pos" | "historique">("pos")
  const [editingSale, setEditingSale] = React.useState<SaleHistoryItem | null>(null)

  const setTab = React.useCallback((value: "pos" | "historique") => {
    setActiveTab(value)
    window.localStorage.setItem(TAB_STORAGE_KEY, value)
  }, [])

  React.useEffect(() => {
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY)
    if (stored === "pos" || stored === "historique") {
      setActiveTab(stored)
    }
  }, [])

  const handleTabChange = React.useCallback(
    (value: string) => {
      if (value !== "pos" && value !== "historique") {
        return
      }
      if (value === "historique") {
        setEditingSale(null)
      }
      setTab(value)
    },
    [setTab]
  )

  const handleEditSale = React.useCallback(
    (sale: SaleHistoryItem) => {
      setEditingSale(sale)
      setTab("pos")
    },
    [setTab]
  )

  const handleEditComplete = React.useCallback(() => {
    setEditingSale(null)
    setTab("historique")
  }, [setTab])

  const handleEditCancel = React.useCallback(() => {
    setEditingSale(null)
    setTab("historique")
  }, [setTab])

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
          <SalesPos
            editingSale={editingSale}
            onEditComplete={handleEditComplete}
            onCancelEdit={handleEditCancel}
          />
        </TabsContent>
        <TabsContent value="historique" className="space-y-4">
          <SalesHistoryPanel onEdit={handleEditSale} />
        </TabsContent>
      </PageShell>
    </Tabs>
  )
}
