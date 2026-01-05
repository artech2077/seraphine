"use client"

import * as React from "react"

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
import type { InventoryItem } from "@/components/inventory-table"

const categoryOptions = [
  "Medicaments",
  "Parapharmacie",
  "Materiel",
  "Hygiene",
]

const dosageOptions = [
  "Comprime",
  "Gel",
  "Pastille",
  "Flacon",
  "Consommable",
]

const vatOptions = ["0", "7", "19"]

type InventoryProductModalProps = {
  mode: "create" | "edit"
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  item?: InventoryItem
}

export function InventoryProductModal({
  mode,
  trigger,
  open,
  onOpenChange,
  item,
}: InventoryProductModalProps) {
  const id = React.useId()
  const isEdit = mode === "edit"
  const title = isEdit ? "Modifier le produit" : "Ajouter un produit"
  const description = isEdit
    ? `Mettez a jour les informations de ${item?.name ?? "ce produit"}.`
    : "Renseignez les informations pour creer une nouvelle fiche produit."

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {trigger && <ModalTrigger render={trigger} />}
      <ModalContent showCloseButton>
        <ModalHeader showCloseButton>
          <ModalTitle>{title}</ModalTitle>
          <ModalDescription>{description}</ModalDescription>
        </ModalHeader>
        <ModalForm onSubmit={handleSubmit}>
          <ModalBody>
            <div className="grid gap-3">
              <Label htmlFor={`${id}-product-name`}>Nom du produit</Label>
              <Input
                id={`${id}-product-name`}
                placeholder="Nom commercial"
                defaultValue={item?.name}
              />
            </div>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-product-barcode`}>Code barre</Label>
                <Input
                  id={`${id}-product-barcode`}
                  placeholder="EAN / GTIN"
                  defaultValue={item?.barcode}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-product-category`}>Categorie</Label>
                <Select defaultValue={item?.category}>
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
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-purchase-price`}>Prix d'achat</Label>
                <Input
                  id={`${id}-purchase-price`}
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
                <Select
                  defaultValue={item?.vatRate ? String(item.vatRate) : undefined}
                >
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
              <div className="grid gap-3">
                <Label htmlFor={`${id}-dosage-form`}>Forme galenique</Label>
                <Select defaultValue={item?.dosageForm}>
                  <SelectTrigger id={`${id}-dosage-form`} className="w-full">
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {dosageOptions.map((option) => (
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
                <Label htmlFor={`${id}-initial-stock`}>Stock initial</Label>
                <Input
                  id={`${id}-initial-stock`}
                  type="number"
                  placeholder="Valeur"
                  defaultValue={item?.stock}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-low-stock`}>Seuil d'alerte</Label>
                <Input
                  id={`${id}-low-stock`}
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
                placeholder="Notes de lot, consignes de stockage, etc."
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalClose render={<Button variant="outline" />}>
              Annuler
            </ModalClose>
            <Button type="submit">
              {isEdit ? "Enregistrer" : "Ajouter le produit"}
            </Button>
          </ModalFooter>
        </ModalForm>
      </ModalContent>
    </Modal>
  )
}
