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
import type { SupplierFormValues } from "@/features/fournisseurs/api"
import type { Supplier } from "@/features/fournisseurs/suppliers-table"
import { useRoleAccess } from "@/lib/auth/use-role-access"

type SupplierModalProps = {
  mode: "create" | "edit"
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  item?: Supplier
  onSubmit?: (values: SupplierFormValues, item?: Supplier) => void | Promise<void>
}

export function SupplierModal({
  mode,
  trigger,
  open,
  onOpenChange,
  item,
  onSubmit,
}: SupplierModalProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const resolvedOpen = isControlled ? open : internalOpen
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen
  const { canManage } = useRoleAccess()
  const canManageSuppliers = canManage("fournisseurs")
  const id = React.useId()
  const isEdit = mode === "edit"
  const title = isEdit ? "Modifier un fournisseur" : "Ajouter un fournisseur"

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const balanceValue = Number(formData.get("balance") ?? 0)
    const payload: SupplierFormValues = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      city: String(formData.get("city") ?? ""),
      balance: Number.isFinite(balanceValue) ? balanceValue : 0,
      notes: String(formData.get("notes") ?? ""),
    }

    void Promise.resolve(onSubmit?.(payload, item))
      .then(() => {
        handleOpenChange?.(false)
      })
      .catch(() => null)
  }

  return (
    <Modal open={resolvedOpen} onOpenChange={handleOpenChange}>
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
                  name="name"
                  placeholder="Raison sociale"
                  defaultValue={item?.name}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-supplier-email`}>Email</Label>
                <Input
                  id={`${id}-supplier-email`}
                  name="email"
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
                  name="phone"
                  placeholder="+212 ..."
                  defaultValue={item?.phone}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-supplier-city`}>Ville</Label>
                <Input
                  id={`${id}-supplier-city`}
                  name="city"
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
                  name="balance"
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
                name="notes"
                placeholder="Infos logistiques, conditions negociees..."
                defaultValue={item?.notes}
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
            <Button type="submit" disabled={!canManageSuppliers}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalForm>
      </ModalContent>
    </Modal>
  )
}
