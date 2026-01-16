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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Supplier } from "@/features/fournisseurs/suppliers-table"

type SupplierModalProps = {
  mode: "create" | "edit"
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  item?: Supplier
}

export function SupplierModal({ mode, trigger, open, onOpenChange, item }: SupplierModalProps) {
  const id = React.useId()
  const isEdit = mode === "edit"
  const title = isEdit ? "Modifier un fournisseur" : "Ajouter un fournisseur"

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {trigger && <ModalTrigger render={trigger} />}
      <ModalContent showCloseButton>
        <ModalHeader showCloseButton>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        <ModalForm key={`${mode}-${item?.id ?? "new"}`} onSubmit={handleSubmit}>
          <ModalBody>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-supplier-name`}>Fournisseur</Label>
                <Input
                  id={`${id}-supplier-name`}
                  placeholder="Raison sociale"
                  defaultValue={item?.name}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-supplier-email`}>Email</Label>
                <Input
                  id={`${id}-supplier-email`}
                  type="email"
                  placeholder="email@example.com"
                  defaultValue={item?.email}
                />
              </div>
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-supplier-phone`}>Telephone</Label>
                <Input
                  id={`${id}-supplier-phone`}
                  placeholder="+212 ..."
                  defaultValue={item?.phone}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-supplier-city`}>Ville</Label>
                <Input
                  id={`${id}-supplier-city`}
                  placeholder="Casablanca"
                  defaultValue={item?.city}
                />
              </div>
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-supplier-balance`}>Balance</Label>
                <Input
                  id={`${id}-supplier-balance`}
                  type="number"
                  step="0.01"
                  placeholder="0"
                  defaultValue={item?.balance}
                />
              </div>
            </ModalGrid>
            <div className="grid gap-3">
              <Label htmlFor={`${id}-supplier-notes`}>Notes internes</Label>
              <Textarea
                id={`${id}-supplier-notes`}
                placeholder="Infos logistiques, conditions negociees..."
                defaultValue={item?.notes}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalClose render={<Button variant="outline" />}>Annuler</ModalClose>
            <Button type="submit">Enregistrer</Button>
          </ModalFooter>
        </ModalForm>
      </ModalContent>
    </Modal>
  )
}
