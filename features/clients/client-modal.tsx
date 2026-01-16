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
import type { Client, ClientStatus } from "@/features/clients/clients-table"

const statusOptions: ClientStatus[] = ["OK", "Surveillé", "Bloqué"]

type ClientModalProps = {
  mode: "create" | "edit"
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  item?: Client
}

export function ClientModal({ mode, trigger, open, onOpenChange, item }: ClientModalProps) {
  const id = React.useId()
  const isEdit = mode === "edit"
  const title = isEdit ? "Modifier un client" : "Ajouter un client"

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
                  placeholder="Nom du client"
                  defaultValue={item?.name}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-client-phone`}>Téléphone</Label>
                <Input
                  id={`${id}-client-phone`}
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
                  type="number"
                  step="0.01"
                  placeholder="0"
                  defaultValue={item?.encours}
                />
              </div>
            </ModalGrid>
            <ModalGrid>
              <div className="grid gap-3">
                <Label htmlFor={`${id}-client-status`}>Statut</Label>
                <Select defaultValue={item?.status}>
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
              <div className="hidden sm:block" aria-hidden="true" />
            </ModalGrid>
            <div className="grid gap-3">
              <Label htmlFor={`${id}-client-notes`}>Notes internes</Label>
              <Textarea
                id={`${id}-client-notes`}
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
