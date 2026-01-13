"use client"

import * as React from "react"

import { PageShell } from "@/components/page-shell"
import { PurchaseOrdersPanel } from "@/components/achats-purchase-orders-panel"
import { DeliveryNotesPanel } from "@/components/achats-delivery-notes-panel"
import { ProcurementOrderModal } from "@/components/procurement-order-modal"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DeliveryNote, PurchaseOrder } from "@/components/procurement-data"
import { Plus } from "lucide-react"

const TAB_STORAGE_KEY = "achats:last-tab"

type AchatsPageProps = {
  purchaseOrders: PurchaseOrder[]
  deliveryNotes: DeliveryNote[]
}

export function AchatsPage({ purchaseOrders, deliveryNotes }: AchatsPageProps) {
  const [activeTab, setActiveTab] = React.useState<"commande" | "livraison">(
    "commande"
  )

  React.useEffect(() => {
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY)
    if (stored === "commande" || stored === "livraison") {
      setActiveTab(stored)
    }
  }, [])

  const handleTabChange = React.useCallback((value: string) => {
    if (value !== "commande" && value !== "livraison") {
      return
    }
    setActiveTab(value)
    window.localStorage.setItem(TAB_STORAGE_KEY, value)
  }, [])

  const actionButton =
    activeTab === "livraison" ? (
      <ProcurementOrderModal
        mode="create"
        variant="delivery"
        trigger={
          <Button>
            <Plus className="size-4" />
            Créer un bon de livraison
          </Button>
        }
      />
    ) : (
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        trigger={
          <Button>
            <Plus className="size-4" />
            Créer un bon de commande
          </Button>
        }
      />
    )

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <PageShell
        title="Achats"
        description="Centralisez vos commandes et vos livraisons fournisseurs."
        actions={actionButton}
        tabs={
          <TabsList variant="line">
            <TabsTrigger value="commande">Bons de commande</TabsTrigger>
            <TabsTrigger value="livraison">Bons de livraison</TabsTrigger>
          </TabsList>
        }
      >
        <TabsContent value="commande" className="space-y-4">
          <PurchaseOrdersPanel orders={purchaseOrders} />
        </TabsContent>
        <TabsContent value="livraison" className="space-y-4">
          <DeliveryNotesPanel notes={deliveryNotes} />
        </TabsContent>
      </PageShell>
    </Tabs>
  )
}
