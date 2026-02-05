"use client"

import { Plus } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDeliveryNotes, usePurchaseOrderById, usePurchaseOrders } from "@/features/achats/api"
import { DeliveryNotesPanel } from "@/features/achats/achats-delivery-notes-panel"
import { PurchaseOrdersPanel } from "@/features/achats/achats-purchase-orders-panel"
import { ProcurementOrderModal } from "@/features/achats/procurement-order-modal"
import { useSuppliers } from "@/features/fournisseurs/api"
import { useProductOptions } from "@/features/inventaire/api"
import { useRoleAccess } from "@/lib/auth/use-role-access"

const TAB_STORAGE_KEY = "achats:last-tab"

export function AchatsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderIdParam = searchParams.get("orderId") ?? undefined
  const tabParam = searchParams.get("tab")
  const { createOrder, updateOrder } = usePurchaseOrders({ mode: "mutations" })
  const { createNote } = useDeliveryNotes({ mode: "mutations" })
  const { items: suppliers } = useSuppliers()
  const { options: productOptions } = useProductOptions()
  const { order: alertOrder, isLoading: alertOrderLoading } = usePurchaseOrderById(orderIdParam)
  const { canManage } = useRoleAccess()
  const canManagePurchases = canManage("achats")
  const [activeTab, setActiveTab] = React.useState<"commande" | "livraison">(
    tabParam === "livraison" ? "livraison" : "commande"
  )
  const [alertOrderOpen, setAlertOrderOpen] = React.useState(false)
  const missingOrderRef = React.useRef<string | null>(null)

  const supplierOptions = React.useMemo(
    () => suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name })),
    [suppliers]
  )

  React.useEffect(() => {
    if (orderIdParam) {
      setActiveTab("commande")
      return
    }
    if (tabParam === "commande" || tabParam === "livraison") {
      setActiveTab(tabParam)
      return
    }
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY)
    if (stored === "commande" || stored === "livraison") {
      setActiveTab(stored)
    }
  }, [orderIdParam, tabParam])

  const handleTabChange = React.useCallback(
    (value: string) => {
      if (orderIdParam) {
        setActiveTab("commande")
        return
      }
      if (value !== "commande" && value !== "livraison") {
        return
      }
      setActiveTab(value)
      window.localStorage.setItem(TAB_STORAGE_KEY, value)
    },
    [orderIdParam]
  )

  React.useEffect(() => {
    if (!orderIdParam) {
      missingOrderRef.current = null
      return
    }
    if (alertOrderLoading) return
    if (!alertOrder) {
      if (missingOrderRef.current !== orderIdParam) {
        toast.error("Bon de commande introuvable.")
        missingOrderRef.current = orderIdParam
      }
      router.replace("/app/achats?tab=commande")
      return
    }
    setAlertOrderOpen(true)
  }, [alertOrder, alertOrderLoading, orderIdParam, router])

  const handleAlertOrderOpenChange = React.useCallback(
    (open: boolean) => {
      setAlertOrderOpen(open)
      if (!open) {
        router.replace("/app/achats?tab=commande")
      }
    },
    [router]
  )

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
      <ProcurementOrderModal
        mode="edit"
        variant="purchase"
        open={alertOrderOpen}
        onOpenChange={handleAlertOrderOpenChange}
        order={alertOrder ?? undefined}
        suppliers={supplierOptions}
        products={productOptions}
        onSubmit={async (values) => {
          if (!alertOrder) return
          try {
            await updateOrder(alertOrder, values)
            toast.success("Bon de commande mis à jour.")
          } catch {
            toast.error("Impossible de mettre à jour le bon de commande.")
          }
        }}
      />
    </Tabs>
  )
}
