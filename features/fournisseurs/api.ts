"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Supplier } from "@/features/fournisseurs/suppliers-table"

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
  name: string
  email?: string
  phone?: string
  city?: string
  balance: number
  internalNotes?: string
}

function mapSupplier(record: SupplierRecord): Supplier {
  return {
    id: record._id,
    name: record.name,
    email: record.email ?? "",
    phone: record.phone ?? "",
    city: record.city ?? "",
    balance: record.balance,
    notes: record.internalNotes ?? "",
  }
}

export function useSuppliers() {
  const { isLoaded, orgId, userId } = useAuth()
  const { organization } = useOrganization()
  const ensurePharmacy = useMutation(api.pharmacies.ensureForOrg)
  const orgName = organization?.name ?? "Pharmacie"

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])

  const records = useQuery(api.suppliers.listByOrg, orgId ? { clerkOrgId: orgId } : "skip") as
    | SupplierRecord[]
    | undefined

  const items = React.useMemo(() => (records ? records.map(mapSupplier) : []), [records])

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

  return {
    items,
    isLoading: records === undefined,
    createSupplier,
    updateSupplier,
    removeSupplier,
  }
}
