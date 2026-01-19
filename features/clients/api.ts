"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Client, ClientStatus } from "@/features/clients/clients-table"

export type ClientFormValues = {
  name: string
  phone: string
  city: string
  plafond: number
  encours: number
  status: ClientStatus
  notes?: string
}

type ClientRecord = {
  _id: Id<"clients">
  name: string
  phone?: string
  city?: string
  creditLimit: number
  outstandingBalance: number
  accountStatus: "OK" | "SURVEILLE" | "BLOQUE"
  lastPurchaseDate?: number
  internalNotes?: string
}

const statusMap: Record<ClientStatus, ClientRecord["accountStatus"]> = {
  OK: "OK",
  Surveillé: "SURVEILLE",
  Bloqué: "BLOQUE",
}

const statusLabelMap: Record<ClientRecord["accountStatus"], ClientStatus> = {
  OK: "OK",
  SURVEILLE: "Surveillé",
  BLOQUE: "Bloqué",
}

function formatDate(value?: number) {
  if (!value) return "-"
  return new Date(value).toISOString().slice(0, 10)
}

function mapClient(record: ClientRecord): Client {
  return {
    id: record._id,
    name: record.name,
    phone: record.phone ?? "",
    city: record.city ?? "",
    plafond: record.creditLimit,
    encours: record.outstandingBalance,
    status: statusLabelMap[record.accountStatus],
    lastPurchase: formatDate(record.lastPurchaseDate),
    notes: record.internalNotes ?? "",
  }
}

export function useClients() {
  const { isLoaded, orgId, userId } = useAuth()
  const { organization } = useOrganization()
  const ensurePharmacy = useMutation(api.pharmacies.ensureForOrg)
  const orgName = organization?.name ?? "Pharmacie"

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])

  const records = useQuery(api.clients.listByOrg, orgId ? { clerkOrgId: orgId } : "skip") as
    | ClientRecord[]
    | undefined

  const items = React.useMemo(() => (records ? records.map(mapClient) : []), [records])

  const createClientMutation = useMutation(api.clients.create)
  const updateClientMutation = useMutation(api.clients.update)
  const removeClientMutation = useMutation(api.clients.remove)

  async function createClient(values: ClientFormValues) {
    if (!orgId) return
    await createClientMutation({
      clerkOrgId: orgId,
      name: values.name,
      phone: values.phone || undefined,
      city: values.city || undefined,
      creditLimit: values.plafond,
      outstandingBalance: values.encours,
      accountStatus: statusMap[values.status],
      internalNotes: values.notes || undefined,
    })
  }

  async function updateClient(item: Client, values: ClientFormValues) {
    if (!orgId) return
    await updateClientMutation({
      clerkOrgId: orgId,
      id: item.id as Id<"clients">,
      name: values.name,
      phone: values.phone || undefined,
      city: values.city || undefined,
      creditLimit: values.plafond,
      outstandingBalance: values.encours,
      accountStatus: statusMap[values.status],
      internalNotes: values.notes || undefined,
    })
  }

  async function removeClient(item: Client) {
    if (!orgId) return
    await removeClientMutation({
      clerkOrgId: orgId,
      id: item.id as Id<"clients">,
    })
  }

  return {
    items,
    isLoading: records === undefined,
    createClient,
    updateClient,
    removeClient,
  }
}
