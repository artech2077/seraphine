"use client"

import * as React from "react"

import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalForm,
  ModalGrid,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, Plus } from "lucide-react"
import {
  CHANNEL_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  type DeliveryNote,
  type ProcurementLineItem,
  type PurchaseOrder,
} from "@/features/achats/procurement-data"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { toast } from "sonner"

type SupplierOption = {
  id: string
  name: string
}

type ProductOption = {
  id: string
  name: string
  unitPrice: number
}

type ProcurementLineDraft = ProcurementLineItem & {
  productId?: string
}

const emptyLine = (): ProcurementLineDraft => ({
  id: `line-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  product: "",
  quantity: 0,
  unitPrice: 0,
})

function parseNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

type ProcurementOrderModalProps = {
  mode: "create" | "edit"
  variant: "purchase" | "delivery"
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  order?: PurchaseOrder | DeliveryNote
  suppliers: SupplierOption[]
  products: ProductOption[]
  onSubmit?: (values: {
    supplierId: string
    channel: string
    status: string
    orderDate: string
    externalReference?: string
    items: Array<{ productId: string; quantity: number; unitPrice: number }>
  }) => void | Promise<void>
}

export function ProcurementOrderModal({
  mode,
  variant,
  trigger,
  open,
  onOpenChange,
  order,
  suppliers,
  products,
  onSubmit,
}: ProcurementOrderModalProps) {
  const { canManage } = useRoleAccess()
  const canManagePurchases = canManage("achats")
  const id = React.useId()
  const isEdit = mode === "edit"
  const isDelivery = variant === "delivery"

  const title = isEdit
    ? isDelivery
      ? "Modifier un bon de livraison"
      : "Modifier un bon de commande"
    : isDelivery
      ? "Créer un bon de livraison"
      : "Créer un bon de commande"

  const statusOptions = isDelivery ? DELIVERY_STATUS_OPTIONS : PURCHASE_STATUS_OPTIONS

  const [supplier, setSupplier] = React.useState(order?.supplier ?? "")
  const [supplierId, setSupplierId] = React.useState("")
  const [channel, setChannel] = React.useState(order?.channel ?? "")
  const [status, setStatus] = React.useState(order?.status ?? "Brouillon")
  const [orderDate, setOrderDate] = React.useState(order?.orderDate ?? "")
  const [externalReference, setExternalReference] = React.useState(
    (order as DeliveryNote | undefined)?.externalReference ?? ""
  )
  const [lines, setLines] = React.useState<ProcurementLineDraft[]>(() =>
    order?.items?.length ? order.items.map((item) => ({ ...item })) : [emptyLine()]
  )

  const supplierMap = React.useMemo(
    () => new Map(suppliers.map((option) => [option.name, option.id])),
    [suppliers]
  )
  const productMap = React.useMemo(
    () => new Map(products.map((option) => [option.name, option])),
    [products]
  )

  React.useEffect(() => {
    const nextLines = order?.items?.length
      ? order.items.map((item) => ({
          ...item,
          productId: productMap.get(item.product)?.id,
        }))
      : [emptyLine()]
    setLines(nextLines)
    const nextSupplier = order?.supplier ?? ""
    setSupplier(nextSupplier)
    setSupplierId(nextSupplier ? (supplierMap.get(nextSupplier) ?? "") : "")
    setChannel(order?.channel ?? "")
    setStatus(order?.status ?? "Brouillon")
    setOrderDate(order?.orderDate ?? "")
    setExternalReference((order as DeliveryNote | undefined)?.externalReference ?? "")
  }, [order, productMap, supplierMap])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitWithStatus(status)
  }

  const handleAddLine = () => {
    setLines((current) => [...current, emptyLine()])
  }

  const handleRemoveLine = (lineId: string) => {
    setLines((current) => {
      const next = current.filter((line) => line.id !== lineId)
      return next.length > 0 ? next : [emptyLine()]
    })
  }

  const updateLine = (lineId: string, updates: Partial<ProcurementLineDraft>) => {
    setLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, ...updates } : line))
    )
  }

  const getProductPrice = (productName: string) => {
    return productMap.get(productName)?.unitPrice ?? 0
  }

  const submitWithStatus = (nextStatus: string) => {
    const items = lines
      .filter((line) => line.productId && line.quantity > 0)
      .map((line) => ({
        productId: line.productId as string,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      }))
    if (items.length === 0) return

    if (!supplierId) {
      toast.error("Veuillez sélectionner un fournisseur.")
      return
    }
    if (!orderDate) {
      toast.error("Veuillez renseigner une date.")
      return
    }
    if (items.length === 0) {
      toast.error("Ajoutez au moins un article valide.")
      return
    }

    void Promise.resolve(
      onSubmit?.({
        supplierId,
        channel,
        status: nextStatus,
        orderDate,
        externalReference: isDelivery ? externalReference : undefined,
        items,
      })
    )
      .then(() => {
        toast.success(isDelivery ? "Bon de livraison enregistré." : "Bon de commande enregistré.")
      })
      .catch(() => {
        toast.error("Impossible d'enregistrer ce document.")
      })
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {trigger ? <ModalTrigger render={trigger} /> : null}
      <ModalContent showCloseButton>
        <ModalHeader showCloseButton>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        <ModalForm onSubmit={handleSubmit}>
          <ModalBody>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-supplier`}>Fournisseur</Label>
                <Combobox
                  items={suppliers.map((option) => option.name)}
                  value={supplier}
                  onValueChange={(value) => {
                    const nextValue = value ?? ""
                    setSupplier(nextValue)
                    setSupplierId(nextValue ? (supplierMap.get(nextValue) ?? "") : "")
                  }}
                >
                  <ComboboxInput
                    id={`${id}-supplier`}
                    placeholder="Rechercher un fournisseur"
                    showClear={Boolean(supplier)}
                    className="bg-popover rounded-md min-w-0"
                  />
                  <ComboboxContent align="start" alignOffset={0}>
                    <ComboboxEmpty>Aucun résultat.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-channel`}>Canal</Label>
                <Select value={channel} onValueChange={(value) => setChannel(value ?? "")}>
                  <SelectTrigger id={`${id}-channel`} className="w-full">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-order-date`}>
                  {isDelivery ? "Date de livraison" : "Date de bon de commande"}
                </Label>
                <Input
                  id={`${id}-order-date`}
                  type="date"
                  value={orderDate}
                  onChange={(event) => setOrderDate(event.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-status`}>Statut</Label>
                <Select value={status} onValueChange={(value) => setStatus(value ?? "Brouillon")}>
                  <SelectTrigger id={`${id}-status`} className="w-full">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ModalGrid>
            {isDelivery ? (
              <div className="grid gap-3">
                <Label htmlFor={`${id}-external-ref`}>Réf livraison</Label>
                <Input
                  id={`${id}-external-ref`}
                  placeholder="Référence fournisseur"
                  value={externalReference}
                  onChange={(event) => setExternalReference(event.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Articles</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  disabled={!canManagePurchases}
                >
                  <Plus className="size-4" />
                  Ajouter une ligne
                </Button>
              </div>
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="hidden text-xs text-muted-foreground sm:grid sm:grid-cols-12 sm:gap-3">
                  <span className="sm:col-span-6">Produits</span>
                  <span className="sm:col-span-3">Quantité</span>
                  <span className="sm:col-span-2">Prix unitaire</span>
                </div>
                {lines.map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center"
                  >
                    <div className="sm:col-span-6">
                      <Combobox
                        items={products.map((option) => option.name)}
                        value={line.product}
                        onValueChange={(value) => {
                          const nextValue = value ?? ""
                          const nextPrice = getProductPrice(nextValue)
                          updateLine(line.id, {
                            product: nextValue,
                            productId: productMap.get(nextValue)?.id,
                            unitPrice: nextPrice || line.unitPrice,
                          })
                        }}
                      >
                        <ComboboxInput placeholder="Sélectionner un produit" showClear />
                        <ComboboxContent>
                          <ComboboxEmpty>Aucun résultat.</ComboboxEmpty>
                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item} value={item}>
                                {item}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(line.id, {
                            quantity: parseNumber(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value={line.unitPrice}
                        onChange={(event) =>
                          updateLine(line.id, {
                            unitPrice: parseNumber(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer la ligne"
                        onClick={() => handleRemoveLine(line.id)}
                        disabled={!canManagePurchases}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalClose
              render={
                <Button
                  variant="outline"
                  type="button"
                  disabled={!canManagePurchases}
                  onClick={() => submitWithStatus("Brouillon")}
                >
                  Enregistrer en brouillon
                </Button>
              }
            />
            <ModalClose
              render={
                <Button type="submit" disabled={!canManagePurchases}>
                  Enregistrer
                </Button>
              }
            />
          </ModalFooter>
        </ModalForm>
      </ModalContent>
    </Modal>
  )
}
