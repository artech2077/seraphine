"use client"

import * as React from "react"
import { AlertTriangle, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type { Id } from "@/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLowStockAlertActions, useLowStockAlertSummary } from "@/features/alerts/api"
import { useSuppliers } from "@/features/fournisseurs/api"
import { useRoleAccess } from "@/lib/auth/use-role-access"

const ALERT_REPEAT_MS = 30 * 1000

export function LowStockAlert() {
  const router = useRouter()
  const { summary } = useLowStockAlertSummary()
  const { createLowStockDraft, syncLowStockDraft } = useLowStockAlertActions()
  const { items: suppliers, isLoading: suppliersLoading } = useSuppliers()
  const { canManage } = useRoleAccess()
  const canManagePurchases = canManage("achats")
  const [dismissedAt, setDismissedAt] = React.useState<number | null>(null)
  const [dismissedSignature, setDismissedSignature] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = React.useState("")
  const [forceShow, setForceShow] = React.useState(false)
  const syncingRef = React.useRef(false)

  const count = summary?.count ?? 0
  const signature = summary?.signature ?? ""
  const hasActiveDraft = summary?.hasActiveDraft ?? false
  const activeOrderId = summary?.activeOrderId
  const lastSyncedSignature = summary?.lastSyncedSignature ?? ""
  const isDismissed =
    dismissedAt !== null && dismissedSignature === signature && signature.length > 0

  React.useEffect(() => {
    if (!dismissedAt) return
    if (dismissedSignature && signature && dismissedSignature !== signature) {
      setDismissedAt(null)
      setDismissedSignature(null)
      return
    }
    const elapsed = Date.now() - dismissedAt
    if (elapsed >= ALERT_REPEAT_MS) {
      setDismissedAt(null)
      setDismissedSignature(null)
      return
    }
    const timer = window.setTimeout(() => {
      setDismissedAt(null)
      setDismissedSignature(null)
    }, ALERT_REPEAT_MS - elapsed)
    return () => window.clearTimeout(timer)
  }, [dismissedAt, dismissedSignature, signature])

  React.useEffect(() => {
    if (!signature) {
      setForceShow(false)
      return
    }
    setForceShow(false)
  }, [signature])

  React.useEffect(() => {
    if (!dialogOpen) {
      setSelectedSupplierId("")
    }
  }, [dialogOpen])

  React.useEffect(() => {
    if (!hasActiveDraft || !activeOrderId) return
    if (!signature || signature === lastSyncedSignature) return
    if (syncingRef.current) return

    syncingRef.current = true
    void Promise.resolve(syncLowStockDraft(activeOrderId))
      .catch(() => toast.error("Impossible de mettre à jour le bon de commande."))
      .finally(() => {
        syncingRef.current = false
      })
  }, [activeOrderId, hasActiveDraft, lastSyncedSignature, signature, syncLowStockDraft])

  const alertMessage = React.useMemo(() => {
    if (count === 1) {
      return "1 produit est en stock bas et doit être réapprovisionné."
    }
    return `${count} produits sont en stock bas et doivent être réapprovisionnés.`
  }, [count])

  const canShowAlert = count > 0
  const shouldShow = canShowAlert && (forceShow || !isDismissed)
  const showTestButton = canShowAlert

  const ctaLabel = hasActiveDraft ? "Ouvrir le bon de commande" : "Créer un bon de commande"

  const canCreate = canManagePurchases && suppliers.length > 0
  const ctaDisabled = suppliersLoading || !canManagePurchases || (!hasActiveDraft && !canCreate)

  const handleDismiss = React.useCallback(() => {
    if (!signature) return
    setForceShow(false)
    setDismissedAt(Date.now())
    setDismissedSignature(signature)
  }, [signature])

  const handleTestAlert = React.useCallback(() => {
    setForceShow(true)
    setDismissedAt(null)
    setDismissedSignature(null)
  }, [])

  const handleOpenOrder = React.useCallback(
    (orderId: string) => {
      router.push(`/app/achats?tab=commande&orderId=${orderId}`)
    },
    [router]
  )

  const handleCtaClick = React.useCallback(() => {
    if (hasActiveDraft && activeOrderId) {
      handleOpenOrder(activeOrderId)
      return
    }

    if (!canCreate) {
      toast.error("Ajoutez un fournisseur pour créer un bon de commande.")
      return
    }

    setDialogOpen(true)
  }, [activeOrderId, canCreate, handleOpenOrder, hasActiveDraft])

  const handleCreateDraft = React.useCallback(async () => {
    if (!selectedSupplierId) {
      toast.error("Veuillez sélectionner un fournisseur.")
      return
    }

    try {
      const orderId = await createLowStockDraft(selectedSupplierId as Id<"suppliers">)
      setDialogOpen(false)
      if (orderId) {
        handleOpenOrder(String(orderId))
      }
    } catch {
      toast.error("Impossible de créer le bon de commande.")
    }
  }, [createLowStockDraft, handleOpenOrder, selectedSupplierId])

  if (!shouldShow && !showTestButton) {
    return null
  }

  return (
    <>
      {showTestButton ? (
        <div className="px-6 pt-2 flex justify-end">
          <Button size="xs" variant="outline" onClick={handleTestAlert}>
            Tester l&apos;alerte
          </Button>
        </div>
      ) : null}
      {shouldShow ? (
        <div className="px-6 pt-4">
          <Alert className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-muted p-2">
                <AlertTriangle className="size-4" />
              </div>
              <div className="grid gap-1">
                <AlertTitle>Stock bas</AlertTitle>
                <AlertDescription>{alertMessage}</AlertDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCtaClick} disabled={ctaDisabled}>
                {ctaLabel}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                aria-label="Masquer l'alerte"
              >
                <X className="size-4" />
              </Button>
            </div>
          </Alert>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un bon de commande</DialogTitle>
                <DialogDescription>
                  Sélectionnez un fournisseur pour générer un bon de commande brouillon.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <Label htmlFor="low-stock-supplier">Fournisseur</Label>
                <Select
                  value={selectedSupplierId}
                  onValueChange={(value) => setSelectedSupplierId(value ?? "")}
                >
                  <SelectTrigger id="low-stock-supplier">
                    <SelectValue placeholder="Choisir un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateDraft}
                  disabled={!selectedSupplierId || suppliersLoading || !canManagePurchases}
                >
                  Créer un bon de commande
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </>
  )
}
