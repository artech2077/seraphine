"use client"

import * as React from "react"

import { PageShell } from "@/components/layout/page-shell"
import { useDeliveryNotes, usePurchaseOrders } from "@/features/achats/api"
import { PurchaseOrdersPanel } from "@/features/achats/achats-purchase-orders-panel"
import { DeliveryNotesPanel } from "@/features/achats/achats-delivery-notes-panel"
import { ProcurementOrderModal } from "@/features/achats/procurement-order-modal"
import { useSuppliers } from "@/features/fournisseurs/api"
import { useProductOptions } from "@/features/inventaire/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { Plus } from "lucide-react"

const TAB_STORAGE_KEY = "achats:last-tab"

export function AchatsPage() {
  const { createOrder } = usePurchaseOrders({ mode: "mutations" })
  const { createNote } = useDeliveryNotes({ mode: "mutations" })
  const { items: suppliers } = useSuppliers()
  const { options: productOptions } = useProductOptions()
  const { canManage } = useRoleAccess()
  const canManagePurchases = canManage("achats")
  const [activeTab, setActiveTab] = React.useState<"commande" | "livraison">("commande")

  const supplierOptions = React.useMemo(
    () => suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name })),
    [suppliers]
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
        suppliers={supplierOptions}
        products={productOptions}
        onSubmit={async (values) => {
          try {
            await createNote(values)
            toast.success("Bon de livraison enregistré.")
          } catch {
            toast.error("Impossible d'enregistrer le bon de livraison.")
          }
        }}
        trigger={
          <Button disabled={!canManagePurchases}>
            <Plus className="size-4" />
            Créer un bon de livraison
          </Button>
        }
      />
    ) : (
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        suppliers={supplierOptions}
        products={productOptions}
        onSubmit={async (values) => {
          try {
            await createOrder(values)
            toast.success("Bon de commande enregistré.")
          } catch {
            toast.error("Impossible d'enregistrer le bon de commande.")
          }
        }}
        trigger={
          <Button disabled={!canManagePurchases}>
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
          <PurchaseOrdersPanel suppliers={supplierOptions} products={productOptions} />
        </TabsContent>
        <TabsContent value="livraison" className="space-y-4">
          <DeliveryNotesPanel suppliers={supplierOptions} products={productOptions} />
        </TabsContent>
      </PageShell>
    </Tabs>
  )
}
