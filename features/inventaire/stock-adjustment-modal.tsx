"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalForm,
  ModalGrid,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { StockAdjustmentValues } from "@/features/inventaire/api"
import type { InventoryItem } from "@/features/inventaire/inventory-table"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { toast } from "sonner"

type StockAdjustmentModalProps = {
  trigger?: React.ReactElement
  items: InventoryItem[]
  initialProductId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSubmit?: (values: StockAdjustmentValues) => void | Promise<void>
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

export function StockAdjustmentModal({
  trigger,
  items,
  initialProductId,
  open,
  onOpenChange,
  onSubmit,
}: StockAdjustmentModalProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const resolvedOpen = isControlled ? open : internalOpen
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen
  const { canManage } = useRoleAccess()
  const canManageInventory = canManage("inventaire")
  const [productId, setProductId] = React.useState(initialProductId ?? items[0]?.id ?? "")
  const [direction, setDirection] = React.useState<"IN" | "OUT">("OUT")
  const [quantity, setQuantity] = React.useState("1")
  const [reason, setReason] = React.useState("")
  const [note, setNote] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!resolvedOpen) return

    if (initialProductId && items.some((item) => item.id === initialProductId)) {
      setProductId(initialProductId)
      return
    }

    if (items.some((item) => item.id === productId)) {
      return
    }
    setProductId(items[0]?.id ?? "")
  }, [initialProductId, items, productId, resolvedOpen])

  const selectedProduct = React.useMemo(
    () => items.find((item) => item.id === productId) ?? null,
    [items, productId]
  )
  const quantityValue = Number.parseFloat(quantity)
  const normalizedQuantity = Number.isFinite(quantityValue) ? quantityValue : 0
  const signedDelta = direction === "IN" ? normalizedQuantity : -normalizedQuantity
  const nextStock = selectedProduct ? selectedProduct.stock + signedDelta : null

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!productId) {
      toast.error("Sélectionnez un produit.")
      return
    }
    if (normalizedQuantity <= 0) {
      toast.error("La quantité doit être supérieure à 0.")
      return
    }
    if (!reason.trim()) {
      toast.error("Le motif d'ajustement est requis.")
      return
    }
    if (typeof nextStock === "number" && nextStock < 0) {
      toast.error("Le stock ne peut pas devenir négatif.")
      return
    }

    setSubmitting(true)
    try {
      await onSubmit?.({
        productId,
        direction,
        quantity: normalizedQuantity,
        reason: reason.trim(),
        note: note.trim() || undefined,
      })

      if (selectedProduct && typeof nextStock === "number") {
        toast.success(
          `Stock ajusté pour ${selectedProduct.name}: ${selectedProduct.stock} -> ${nextStock}.`
        )
      } else {
        toast.success("Stock ajusté.")
      }

      setReason("")
      setNote("")
      setQuantity("1")
      handleOpenChange?.(false)
    } catch (error) {
      toast.error(getErrorMessage(error, "Impossible d'ajuster le stock."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={resolvedOpen} onOpenChange={handleOpenChange}>
      {trigger ? <ModalTrigger render={trigger} /> : null}
      <ModalContent showCloseButton>
        <ModalHeader showCloseButton>
          <ModalTitle>Ajuster le stock</ModalTitle>
          <ModalDescription>
            Corrigez une quantité de stock avec un motif obligatoire.
          </ModalDescription>
        </ModalHeader>
        <ModalForm onSubmit={handleSubmit}>
          <ModalBody>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor="stock-adjustment-product">Produit</Label>
                <Select value={productId} onValueChange={(value) => setProductId(value ?? "")}>
                  <SelectTrigger id="stock-adjustment-product" className="w-full">
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="stock-adjustment-direction">Direction</Label>
                <Select
                  value={direction}
                  onValueChange={(value) => setDirection((value as "IN" | "OUT") ?? "OUT")}
                >
                  <SelectTrigger id="stock-adjustment-direction" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OUT">Sortie</SelectItem>
                    <SelectItem value="IN">Entrée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor="stock-adjustment-quantity">Quantité</Label>
                <Input
                  id="stock-adjustment-quantity"
                  type="number"
                  min={1}
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="stock-adjustment-reason">Motif</Label>
                <Input
                  id="stock-adjustment-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Casse, perte, retour client, correction..."
                />
              </div>
            </ModalGrid>
            <div className="grid gap-3">
              <Label htmlFor="stock-adjustment-note">Note (optionnel)</Label>
              <Textarea
                id="stock-adjustment-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Détails utiles pour l'équipe."
              />
            </div>
            <div className="bg-muted/40 space-y-2 rounded-lg border p-3 text-sm">
              <p className="font-medium">Confirmation</p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stock avant</span>
                <span className="tabular-nums">{selectedProduct?.stock ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delta</span>
                <span className="tabular-nums">
                  {Number.isFinite(signedDelta) ? signedDelta : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stock après</span>
                <span className="font-medium tabular-nums">{nextStock ?? "-"}</span>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalClose
              render={
                <Button variant="outline" type="button">
                  Annuler
                </Button>
              }
            />
            <Button
              type="submit"
              disabled={!canManageInventory || submitting || items.length === 0}
            >
              Appliquer
            </Button>
          </ModalFooter>
        </ModalForm>
      </ModalContent>
    </Modal>
  )
}
