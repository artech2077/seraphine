"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useConvex, useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Client, ClientStatus } from "@/features/clients/clients-table"
import { useStableQuery } from "@/hooks/use-stable-query"

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
  clientNumber?: string
  clientSequence?: number
  name: string
  phone?: string
  city?: string
  creditLimit: number
  outstandingBalance: number
  accountStatus: "OK" | "SURVEILLE" | "BLOQUE"
  lastPurchaseDate?: number
  internalNotes?: string
  createdAt?: number
}

type ClientListFilters = {
  names?: string[]
  cities?: string[]
  statuses?: ClientStatus[]
}

type ClientListOptions = {
  mode?: "all" | "paged"
  page?: number
  pageSize?: number
  filters?: ClientListFilters
}

type ClientsListResponse = {
  items: ClientRecord[]
  totalCount: number
  filterOptions: {
    names: string[]
    cities: string[]
  }
  fallbackNumbers: Record<string, string>
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

const CLIENT_PREFIX = "CLI-"

function formatDate(value?: number) {
  if (!value) return "-"
  return new Date(value).toISOString().slice(0, 10)
}

function formatClientNumber(sequence: number) {
  return `${CLIENT_PREFIX}${String(sequence).padStart(2, "0")}`
}

function parseClientNumber(value?: string | null) {
  if (!value) return null
  const match = value.match(/^CLI-(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

function mapClient(record: ClientRecord, fallbackNumber?: string): Client {
  const clientNumber =
    record.clientNumber ??
    (record.clientSequence ? formatClientNumber(record.clientSequence) : undefined) ??
    fallbackNumber ??
    formatClientNumber(1)
  return {
    id: record._id,
    clientNumber,
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

export function useClients(options?: ClientListOptions) {
  const { orgId } = useAuth()
  const convex = useConvex()
  const mode = options?.mode ?? "all"
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 10

  const listFilters = React.useMemo(
    () => ({
      names: options?.filters?.names ?? [],
      cities: options?.filters?.cities ?? [],
      statuses: (options?.filters?.statuses ?? []).map((status) => statusMap[status]),
    }),
    [options?.filters?.cities, options?.filters?.names, options?.filters?.statuses]
  )

  const pagedResponseQuery = useStableQuery(
    api.clients.listByOrgPaginated,
    orgId && mode === "paged"
      ? { clerkOrgId: orgId, pagination: { page, pageSize }, filters: listFilters }
      : "skip"
  ) as { data: ClientsListResponse | undefined; isLoading: boolean; isFetching: boolean }
  const pagedResponse = pagedResponseQuery.data

  const recordsQuery = useStableQuery(
    api.clients.listByOrg,
    orgId && mode !== "paged" ? { clerkOrgId: orgId } : "skip"
  ) as { data: ClientRecord[] | undefined; isLoading: boolean; isFetching: boolean }
  const records = recordsQuery.data

  const items = React.useMemo(() => {
    const source = mode === "paged" ? pagedResponse?.items : records
    if (!source) return []

    const fallbackNumbers =
      mode === "paged"
        ? new Map(Object.entries(pagedResponse?.fallbackNumbers ?? {}))
        : (() => {
            const usedSequences = new Set<number>()
            source.forEach((record) => {
              const sequence = record.clientSequence ?? parseClientNumber(record.clientNumber)
              if (sequence) {
                usedSequences.add(sequence)
              }
            })

            const generated = new Map<string, string>()
            const missing = [...source]
              .filter((record) => !record.clientNumber && !record.clientSequence)
              .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))

            let nextSequence = 1
            missing.forEach((record) => {
              while (usedSequences.has(nextSequence)) {
                nextSequence += 1
              }
              generated.set(String(record._id), formatClientNumber(nextSequence))
              usedSequences.add(nextSequence)
              nextSequence += 1
            })

            return generated
          })()

    return source.map((record) => mapClient(record, fallbackNumbers.get(String(record._id))))
  }, [mode, pagedResponse?.fallbackNumbers, pagedResponse?.items, records])

  const filterOptions = React.useMemo(() => {
    if (mode === "paged") {
      return pagedResponse?.filterOptions ?? { names: [], cities: [] }
    }
    if (!records) return { names: [], cities: [] }
    return {
      names: Array.from(new Set(records.map((record) => record.name))),
      cities: Array.from(new Set(records.map((record) => record.city ?? ""))),
    }
  }, [mode, pagedResponse?.filterOptions, records])

  const totalCount = mode === "paged" ? (pagedResponse?.totalCount ?? 0) : items.length

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

  const exportClients = React.useCallback(async () => {
    if (!orgId) return []
    if (mode !== "paged") {
      return items
    }
    const exportCount = pagedResponse?.totalCount ?? 0
    if (!exportCount) return []

    const response = (await convex.query(api.clients.listByOrgPaginated, {
      clerkOrgId: orgId,
      pagination: { page: 1, pageSize: exportCount },
      filters: listFilters,
    })) as ClientsListResponse

    const fallbackNumbers = new Map(Object.entries(response.fallbackNumbers ?? {}))
    return response.items.map((record) =>
      mapClient(record, fallbackNumbers.get(String(record._id)))
    )
  }, [convex, items, listFilters, mode, orgId, pagedResponse?.totalCount])

  return {
    items,
    isLoading: mode === "paged" ? pagedResponseQuery.isLoading : recordsQuery.isLoading,
    isFetching: mode === "paged" ? pagedResponseQuery.isFetching : recordsQuery.isFetching,
    totalCount,
    filterOptions,
    exportClients,
    createClient,
    updateClient,
    removeClient,
  }
}
