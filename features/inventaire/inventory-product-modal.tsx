"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"

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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { InventoryFormValues } from "@/features/inventaire/api"
import type { InventoryItem } from "@/features/inventaire/inventory-table"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { toast } from "sonner"

const categoryOptions = [
  "Medicaments",
  "Parapharmacie",
  "Materiel",
  "Hygiene",
  "Antalgique",
  "Antispasmodique",
  "Antidiarrheique",
  "Antiacide",
]

const vatOptions = ["0", "7", "20"]

type InventoryProductModalProps = {
  mode: "create" | "edit"
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  item?: InventoryItem
  onSubmit?: (values: InventoryFormValues, item?: InventoryItem) => void | Promise<void>
}

export function InventoryProductModal({
  mode,
  trigger,
  open,
  onOpenChange,
  item,
  onSubmit,
}: InventoryProductModalProps) {
  const { orgId } = useAuth()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const resolvedOpen = isControlled ? open : internalOpen
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen
  const { canManage } = useRoleAccess()
  const canManageInventory = canManage("inventaire")
  const id = React.useId()
  const isEdit = mode === "edit"
  const title = isEdit ? "Modifier le produit" : "Ajouter un produit"
  const description = "Renseignez les informations du produit."
  const [categoryValue, setCategoryValue] = React.useState(item?.category ?? "")
  const [vatValue, setVatValue] = React.useState(item?.vatRate ? String(item.vatRate) : "")
  const [barcodeValue, setBarcodeValue] = React.useState(item?.barcode ?? "")

  React.useEffect(() => {
    setCategoryValue(item?.category ?? "")
    setVatValue(item?.vatRate ? String(item.vatRate) : "")
    setBarcodeValue(item?.barcode ?? "")
  }, [item?.barcode, item?.category, item?.id, item?.vatRate, mode])

  const handleBarcodeScan = React.useCallback((barcode: string) => {
    setBarcodeValue(barcode)
    toast.success("Code barre scanne.")
  }, [])

  useBarcodeScanner({
    clerkOrgId: orgId,
    enabled: canManageInventory && resolvedOpen,
    onScan: handleBarcodeScan,
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const purchasePrice = Number(formData.get("purchasePrice") ?? 0)
    const sellingPrice = Number(formData.get("sellingPrice") ?? 0)
    const stock = Number(formData.get("stock") ?? 0)
    const threshold = Number(formData.get("threshold") ?? 0)
    const vatRate = Number.parseFloat(vatValue || "0")
    const payload: InventoryFormValues = {
      name: String(formData.get("name") ?? ""),
      barcode: barcodeValue.trim(),
      category: categoryValue || "Medicaments",
      dosageForm: String(formData.get("dosageForm") ?? ""),
      purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
      sellingPrice: Number.isFinite(sellingPrice) ? sellingPrice : 0,
      vatRate: Number.isFinite(vatRate) ? vatRate : 0,
      stock: Number.isFinite(stock) ? stock : 0,
      threshold: Number.isFinite(threshold) ? threshold : 0,
      notes: String(formData.get("notes") ?? ""),
    }

    if (!payload.name.trim()) {
      toast.error("Le nom du produit est requis.")
      return
    }
    if (!payload.category.trim()) {
      toast.error("Veuillez sélectionner une catégorie.")
      return
    }
    if (payload.purchasePrice < 0 || payload.sellingPrice < 0) {
      toast.error("Les prix doivent être positifs.")
      return
    }
    if (payload.stock < 0 || payload.threshold < 0) {
      toast.error("Le stock et le seuil doivent être positifs.")
      return
    }

    try {
      await onSubmit?.(payload, item)
      handleOpenChange?.(false)
    } catch {
      // Error feedback is handled by the parent to avoid duplicate toasts.
    }
  }

  return (
    <Modal open={resolvedOpen} onOpenChange={handleOpenChange}>
      {trigger && <ModalTrigger render={trigger} />}
      <ModalContent showCloseButton>
        <ModalHeader showCloseButton>
          <ModalTitle>{title}</ModalTitle>
          <ModalDescription>{description}</ModalDescription>
        </ModalHeader>
        <ModalForm key={`${mode}-${item?.id ?? "new"}`} onSubmit={handleSubmit}>
          <ModalBody>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-product-name`}>Nom du produit</Label>
                <Input
                  id={`${id}-product-name`}
                  name="name"
                  placeholder="Nom commercial"
                  defaultValue={item?.name}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-product-barcode`}>Code barre</Label>
                <Input
                  id={`${id}-product-barcode`}
                  name="barcode"
                  placeholder="EAN / GTIN"
                  value={barcodeValue}
                  onChange={(event) => setBarcodeValue(event.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Scannez un code barre avec le lecteur ou l&apos;ecran scan.
                </p>
              </div>
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-product-category`}>Categorie</Label>
                <Select
                  value={categoryValue}
                  onValueChange={(value) => setCategoryValue(value ?? "")}
                >
                  <SelectTrigger id={`${id}-product-category`} className="w-full">
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-dosage-form`}>Forme galenique</Label>
                <Input
                  id={`${id}-dosage-form`}
                  name="dosageForm"
                  placeholder="Valeur"
                  defaultValue={item?.dosageForm}
                />
              </div>
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-purchase-price`}>Prix d&apos;achat</Label>
                <Input
                  id={`${id}-purchase-price`}
                  name="purchasePrice"
                  type="number"
                  step="0.01"
                  placeholder="Valeur"
                  defaultValue={item?.purchasePrice}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-selling-price`}>Prix de vente</Label>
                <Input
                  id={`${id}-selling-price`}
                  name="sellingPrice"
                  type="number"
                  step="0.01"
                  placeholder="Valeur"
                  defaultValue={item?.sellingPrice}
                />
              </div>
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-vat-rate`}>TVA</Label>
                <Select value={vatValue} onValueChange={(value) => setVatValue(value ?? "")}>
                  <SelectTrigger id={`${id}-vat-rate`} className="w-full">
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {vatOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-initial-stock`}>Stock initial</Label>
                <Input
                  id={`${id}-initial-stock`}
                  name="stock"
                  type="number"
                  placeholder="Valeur"
                  defaultValue={item?.stock}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-low-stock`}>Seuil d&apos;alerte</Label>
                <Input
                  id={`${id}-low-stock`}
                  name="threshold"
                  type="number"
                  placeholder="Valeur"
                  defaultValue={item?.threshold}
                />
              </div>
            </ModalGrid>
            <div className="grid gap-3">
              <Label htmlFor={`${id}-internal-notes`}>Notes internes</Label>
              <Textarea
                id={`${id}-internal-notes`}
                name="notes"
                placeholder="Notes de lot, consignes de stockage, etc."
              />
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
            <Button type="submit" disabled={!canManageInventory}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalForm>
      </ModalContent>
    </Modal>
  )
}
