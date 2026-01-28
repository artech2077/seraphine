"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useConvex, useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Supplier } from "@/features/fournisseurs/suppliers-table"
import { useStableQuery } from "@/hooks/use-stable-query"

export type SupplierFormValues = {
  name: string
  email: string
  phone: string
  city: string
  balance: number
  notes?: string
}

type SupplierRecord = {
  _id: Id<"suppliers">
  supplierNumber?: string
  supplierSequence?: number
  name: string
  email?: string
  phone?: string
  city?: string
  balance: number
  internalNotes?: string
  createdAt?: number
}

type SupplierListFilters = {
  names?: string[]
  cities?: string[]
  balances?: string[]
}

type SupplierListOptions = {
  mode?: "all" | "paged"
  page?: number
  pageSize?: number
  filters?: SupplierListFilters
}

type SuppliersListResponse = {
  items: SupplierRecord[]
  totalCount: number
  filterOptions: {
    names: string[]
    cities: string[]
  }
  fallbackNumbers: Record<string, string>
}

const SUPPLIER_PREFIX = "FOUR-"

function formatSupplierNumber(sequence: number) {
  return `${SUPPLIER_PREFIX}${String(sequence).padStart(2, "0")}`
}

function parseSupplierNumber(value?: string | null) {
  if (!value) return null
  const match = value.match(/^FOUR-(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

function mapSupplier(record: SupplierRecord, fallbackNumber?: string): Supplier {
  const supplierNumber =
    record.supplierNumber ??
    (record.supplierSequence ? formatSupplierNumber(record.supplierSequence) : undefined) ??
    fallbackNumber ??
    formatSupplierNumber(1)
  return {
    id: record._id,
    supplierNumber,
    name: record.name,
    email: record.email ?? "",
    phone: record.phone ?? "",
    city: record.city ?? "",
    balance: record.balance,
    notes: record.internalNotes ?? "",
  }
}

export function useSuppliers(options?: SupplierListOptions) {
  const { orgId } = useAuth()
  const convex = useConvex()
  const mode = options?.mode ?? "all"
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 10

  const listFilters = React.useMemo(
    () => ({
      names: options?.filters?.names ?? [],
      cities: options?.filters?.cities ?? [],
      balances: options?.filters?.balances ?? [],
    }),
    [options?.filters?.balances, options?.filters?.cities, options?.filters?.names]
  )

  const pagedResponseQuery = useStableQuery(
    api.suppliers.listByOrgPaginated,
    orgId && mode === "paged"
      ? { clerkOrgId: orgId, pagination: { page, pageSize }, filters: listFilters }
      : "skip"
  ) as { data: SuppliersListResponse | undefined; isLoading: boolean; isFetching: boolean }
  const pagedResponse = pagedResponseQuery.data

  const recordsQuery = useStableQuery(
    api.suppliers.listByOrg,
    orgId && mode !== "paged" ? { clerkOrgId: orgId } : "skip"
  ) as { data: SupplierRecord[] | undefined; isLoading: boolean; isFetching: boolean }
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
              const sequence = record.supplierSequence ?? parseSupplierNumber(record.supplierNumber)
              if (sequence) {
                usedSequences.add(sequence)
              }
            })

            const generated = new Map<string, string>()
            const missing = [...source]
              .filter((record) => !record.supplierNumber && !record.supplierSequence)
              .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))

            let nextSequence = 1
            missing.forEach((record) => {
              while (usedSequences.has(nextSequence)) {
                nextSequence += 1
              }
              generated.set(String(record._id), formatSupplierNumber(nextSequence))
              usedSequences.add(nextSequence)
              nextSequence += 1
            })

            return generated
          })()

    return source.map((record) => mapSupplier(record, fallbackNumbers.get(String(record._id))))
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

  const createSupplierMutation = useMutation(api.suppliers.create)
  const updateSupplierMutation = useMutation(api.suppliers.update)
  const removeSupplierMutation = useMutation(api.suppliers.remove)

  async function createSupplier(values: SupplierFormValues) {
    if (!orgId) return
    await createSupplierMutation({
      clerkOrgId: orgId,
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
      city: values.city || undefined,
      balance: values.balance,
      internalNotes: values.notes || undefined,
    })
  }

  async function updateSupplier(item: Supplier, values: SupplierFormValues) {
    if (!orgId) return
    await updateSupplierMutation({
      clerkOrgId: orgId,
      id: item.id as Id<"suppliers">,
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
      city: values.city || undefined,
      balance: values.balance,
      internalNotes: values.notes || undefined,
    })
  }

  async function removeSupplier(item: Supplier) {
    if (!orgId) return
    await removeSupplierMutation({
      clerkOrgId: orgId,
      id: item.id as Id<"suppliers">,
    })
  }

  const exportSuppliers = React.useCallback(async () => {
    if (!orgId) return []
    if (mode !== "paged") {
      return items
    }
    const exportCount = pagedResponse?.totalCount ?? 0
    if (!exportCount) return []

    const response = (await convex.query(api.suppliers.listByOrgPaginated, {
      clerkOrgId: orgId,
      pagination: { page: 1, pageSize: exportCount },
      filters: listFilters,
    })) as SuppliersListResponse

    const fallbackNumbers = new Map(Object.entries(response.fallbackNumbers ?? {}))
    return response.items.map((record) =>
      mapSupplier(record, fallbackNumbers.get(String(record._id)))
    )
  }, [convex, items, listFilters, mode, orgId, pagedResponse?.totalCount])

  return {
    items,
    isLoading: mode === "paged" ? pagedResponseQuery.isLoading : recordsQuery.isLoading,
    isFetching: mode === "paged" ? pagedResponseQuery.isFetching : recordsQuery.isFetching,
    totalCount,
    filterOptions,
    exportSuppliers,
    createSupplier,
    updateSupplier,
    removeSupplier,
  }
}
