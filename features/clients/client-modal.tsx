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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ClientFormValues } from "@/features/clients/api"
import type { Client, ClientStatus } from "@/features/clients/clients-table"
import { useRoleAccess } from "@/lib/auth/use-role-access"

const statusOptions: ClientStatus[] = ["OK", "Surveillé", "Bloqué"]

type ClientModalProps = {
  mode: "create" | "edit"
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  item?: Client
  onSubmit?: (values: ClientFormValues, item?: Client) => void | Promise<void>
}

export function ClientModal({
  mode,
  trigger,
  open,
  onOpenChange,
  item,
  onSubmit,
}: ClientModalProps) {
  const { canManage } = useRoleAccess()
  const canManageClients = canManage("clients")
  const id = React.useId()
  const isEdit = mode === "edit"
  const title = isEdit ? "Modifier un client" : "Ajouter un client"
  const [statusValue, setStatusValue] = React.useState<ClientStatus>(item?.status ?? "OK")

  React.useEffect(() => {
    setStatusValue(item?.status ?? "OK")
  }, [item?.id, item?.status, mode])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const plafondValue = Number(formData.get("plafond") ?? 0)
    const encoursValue = Number(formData.get("encours") ?? 0)
    const payload: ClientFormValues = {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      city: String(formData.get("city") ?? ""),
      plafond: Number.isFinite(plafondValue) ? plafondValue : 0,
      encours: Number.isFinite(encoursValue) ? encoursValue : 0,
      status: statusValue,
      notes: String(formData.get("notes") ?? ""),
    }

    void onSubmit?.(payload, item)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {trigger ? <ModalTrigger render={trigger} /> : null}
      <ModalContent showCloseButton>
        <ModalHeader showCloseButton>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        <ModalForm key={`${mode}-${item?.id ?? "new"}`} onSubmit={handleSubmit}>
          <ModalBody>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-client-name`}>Nom</Label>
                <Input
                  id={`${id}-client-name`}
                  name="name"
                  placeholder="Nom du client"
                  defaultValue={item?.name}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-client-phone`}>Téléphone</Label>
                <Input
                  id={`${id}-client-phone`}
                  name="phone"
                  type="tel"
                  placeholder="+212..."
                  defaultValue={item?.phone}
                />
              </div>
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-client-plafond`}>Plafond</Label>
                <Input
                  id={`${id}-client-plafond`}
                  name="plafond"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  defaultValue={item?.plafond}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-client-encours`}>Encours</Label>
                <Input
                  id={`${id}-client-encours`}
                  name="encours"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  defaultValue={item?.encours}
                />
              </div>
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-client-city`}>Ville</Label>
                <Input
                  id={`${id}-client-city`}
                  name="city"
                  placeholder="Casablanca"
                  defaultValue={item?.city}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-client-status`}>Statut</Label>
                <Select
                  value={statusValue}
                  onValueChange={(value) => setStatusValue(value as ClientStatus)}
                >
                  <SelectTrigger id={`${id}-client-status`} className="w-full">
                    <SelectValue placeholder="Statut" />
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
            <div className="grid gap-3">
              <Label htmlFor={`${id}-client-notes`}>Notes internes</Label>
              <Textarea
                id={`${id}-client-notes`}
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
            <ModalClose
              render={
                <Button type="submit" disabled={!canManageClients}>
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
