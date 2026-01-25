"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useConvex, useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { DeliveryNote, PurchaseOrder } from "@/features/achats/procurement-data"

export type ProcurementLineInput = {
  productId: string
  quantity: number
  unitPrice: number
}

export type ProcurementFormValues = {
  supplierId: string
  channel: string
  status: string
  orderDate: string
  externalReference?: string
  items: ProcurementLineInput[]
}

type ProcurementItem = {
  id: string
  productName: string
  quantity: number
  unitPrice: number
}

type ProcurementOrder = {
  id: string
  orderNumber?: string | null
  orderSequence?: number | null
  supplierName: string
  channel: "EMAIL" | "PHONE" | null
  createdAt: number
  orderDate: number
  totalAmount: number
  status: "DRAFT" | "ORDERED" | "DELIVERED"
  type: "PURCHASE_ORDER" | "DELIVERY_NOTE"
  externalReference: string | null
  items: ProcurementItem[]
}

type ProcurementListFilters = {
  supplierNames?: string[]
  statuses?: Array<"DRAFT" | "ORDERED" | "DELIVERED">
  references?: string[]
  orderFrom?: number
  orderTo?: number
  createdFrom?: number
  createdTo?: number
}

type ProcurementListOptions = {
  mode?: "all" | "paged" | "mutations"
  page?: number
  pageSize?: number
  filters?: ProcurementListFilters
}

type ProcurementListResponse = {
  items: ProcurementOrder[]
  totalCount: number
  filterOptions: {
    suppliers: string[]
    references: string[]
  }
  fallbackNumbers: Record<string, string>
}

const channelLabels: Record<string, string> = {
  EMAIL: "Email",
  PHONE: "Téléphone",
}

const purchaseStatusLabels: Record<string, PurchaseOrder["status"]> = {
  DRAFT: "Brouillon",
  ORDERED: "Commandé",
  DELIVERED: "Livré",
}

const deliveryStatusLabels: Record<string, DeliveryNote["status"]> = {
  DRAFT: "Brouillon",
  ORDERED: "En cours",
  DELIVERED: "Livré",
}

const ORDER_PREFIXES = {
  PURCHASE_ORDER: "BC-",
  DELIVERY_NOTE: "BL-",
} as const

function formatDate(value: number) {
  return new Date(value).toISOString().slice(0, 10)
}

function parseDate(value: string) {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? Date.now() : parsed
}

function mapChannel(value: string) {
  if (value === "Email") return "EMAIL"
  if (value === "Téléphone") return "PHONE"
  return undefined
}

function mapPurchaseStatus(value: string) {
  switch (value) {
    case "Commandé":
      return "ORDERED"
    case "Livré":
      return "DELIVERED"
    default:
      return "DRAFT"
  }
}

function mapDeliveryStatus(value: string) {
  switch (value) {
    case "En cours":
      return "ORDERED"
    case "Livré":
      return "DELIVERED"
    default:
      return "DRAFT"
  }
}

function formatOrderNumber(prefix: string, sequence: number) {
  return `${prefix}${String(sequence).padStart(2, "0")}`
}

function parseOrderNumber(prefix: string, value?: string | null) {
  if (!value) return null
  const match = value.match(
    new RegExp(`^${prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}(\\d+)$`)
  )
  if (!match) return null
  return Number(match[1])
}

function buildFallbackNumbers(orders: ProcurementOrder[], prefix: string) {
  const usedSequences = new Set<number>()
  orders.forEach((order) => {
    const sequence = order.orderSequence ?? parseOrderNumber(prefix, order.orderNumber)
    if (sequence) {
      usedSequences.add(sequence)
    }
  })

  const fallbackNumbers = new Map<string, string>()
  const missing = orders
    .filter((order) => !order.orderNumber && !order.orderSequence)
    .sort((a, b) => a.createdAt - b.createdAt)

  let nextSequence = 1
  missing.forEach((order) => {
    while (usedSequences.has(nextSequence)) {
      nextSequence += 1
    }
    fallbackNumbers.set(order.id, formatOrderNumber(prefix, nextSequence))
    usedSequences.add(nextSequence)
    nextSequence += 1
  })

  return fallbackNumbers
}

function mapPurchaseOrder(order: ProcurementOrder, fallbackNumber?: string): PurchaseOrder {
  const orderNumber =
    order.orderNumber ??
    (order.orderSequence
      ? formatOrderNumber(ORDER_PREFIXES.PURCHASE_ORDER, order.orderSequence)
      : undefined) ??
    fallbackNumber ??
    formatOrderNumber(ORDER_PREFIXES.PURCHASE_ORDER, 1)
  return {
    id: String(order.id),
    orderNumber,
    supplier: order.supplierName,
    channel: channelLabels[order.channel ?? ""] ?? "Portail",
    createdAt: formatDate(order.createdAt),
    orderDate: formatDate(order.orderDate),
    total: order.totalAmount,
    status: purchaseStatusLabels[order.status] ?? "Brouillon",
    items: order.items.map((item) => ({
      id: String(item.id),
      product: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  }
}

function mapDeliveryNote(order: ProcurementOrder, fallbackNumber?: string): DeliveryNote {
  const orderNumber =
    order.orderNumber ??
    (order.orderSequence
      ? formatOrderNumber(ORDER_PREFIXES.DELIVERY_NOTE, order.orderSequence)
      : undefined) ??
    fallbackNumber ??
    formatOrderNumber(ORDER_PREFIXES.DELIVERY_NOTE, 1)
  return {
    id: String(order.id),
    orderNumber,
    supplier: order.supplierName,
    channel: channelLabels[order.channel ?? ""] ?? "Portail",
    createdAt: formatDate(order.createdAt),
    orderDate: formatDate(order.orderDate),
    externalReference: order.externalReference ?? "-",
    total: order.totalAmount,
    status: deliveryStatusLabels[order.status] ?? "Brouillon",
    items: order.items.map((item) => ({
      id: String(item.id),
      product: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  }
}

export function usePurchaseOrders(options?: ProcurementListOptions) {
  const { isLoaded, orgId, userId } = useAuth()
  const { organization } = useOrganization()
  const ensurePharmacy = useMutation(api.pharmacies.ensureForOrg)
  const orgName = organization?.name ?? "Pharmacie"
  const convex = useConvex()
  const mode = options?.mode ?? "all"
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 10
  const listFilters = React.useMemo(
    () => ({
      supplierNames: options?.filters?.supplierNames ?? [],
      statuses: options?.filters?.statuses ?? [],
      references: options?.filters?.references ?? [],
      orderFrom: options?.filters?.orderFrom,
      orderTo: options?.filters?.orderTo,
      createdFrom: options?.filters?.createdFrom,
      createdTo: options?.filters?.createdTo,
    }),
    [
      options?.filters?.createdFrom,
      options?.filters?.createdTo,
      options?.filters?.orderFrom,
      options?.filters?.orderTo,
      options?.filters?.references,
      options?.filters?.statuses,
      options?.filters?.supplierNames,
    ]
  )
  const createOrderMutation = useMutation(api.procurement.create)
  const updateOrderMutation = useMutation(api.procurement.update)
  const removeOrderMutation = useMutation(api.procurement.remove)

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])

  const pagedResponse = useQuery(
    api.procurement.listByOrgPaginated,
    orgId && mode === "paged"
      ? {
          clerkOrgId: orgId,
          type: "PURCHASE_ORDER",
          pagination: { page, pageSize },
          filters: listFilters,
        }
      : "skip"
  ) as ProcurementListResponse | undefined

  const orders = useQuery(
    api.procurement.listByOrg,
    orgId && mode === "all" ? { clerkOrgId: orgId, type: "PURCHASE_ORDER" } : "skip"
  ) as ProcurementOrder[] | undefined

  const mappedOrders = React.useMemo(() => {
    const source = mode === "paged" ? pagedResponse?.items : orders
    if (!source) return []
    const fallbackNumbers =
      mode === "paged"
        ? new Map(Object.entries(pagedResponse?.fallbackNumbers ?? {}))
        : buildFallbackNumbers(source, ORDER_PREFIXES.PURCHASE_ORDER)
    return source.map((order) => mapPurchaseOrder(order, fallbackNumbers.get(order.id)))
  }, [mode, orders, pagedResponse?.fallbackNumbers, pagedResponse?.items])

  const filterOptions = React.useMemo(() => {
    if (mode === "paged") {
      return pagedResponse?.filterOptions ?? { suppliers: [], references: [] }
    }
    if (!orders) return { suppliers: [], references: [] }
    return {
      suppliers: Array.from(new Set(orders.map((order) => order.supplierName))),
      references: Array.from(new Set(orders.map((order) => order.externalReference ?? ""))),
    }
  }, [mode, orders, pagedResponse?.filterOptions])

  const totalCount = mode === "paged" ? (pagedResponse?.totalCount ?? 0) : mappedOrders.length

  const exportOrders = React.useCallback(async () => {
    if (!orgId) return []
    if (mode !== "paged") {
      return mappedOrders
    }
    const exportCount = pagedResponse?.totalCount ?? 0
    if (!exportCount) return []
    const response = (await convex.query(api.procurement.listByOrgPaginated, {
      clerkOrgId: orgId,
      type: "PURCHASE_ORDER",
      pagination: { page: 1, pageSize: exportCount },
      filters: listFilters,
    })) as ProcurementListResponse
    const fallbackNumbers = new Map(Object.entries(response.fallbackNumbers ?? {}))
    return response.items.map((order) => mapPurchaseOrder(order, fallbackNumbers.get(order.id)))
  }, [convex, listFilters, mappedOrders, mode, orgId, pagedResponse?.totalCount])

  return {
    orders: mappedOrders,
    isLoading:
      mode === "paged"
        ? pagedResponse === undefined
        : mode === "all"
          ? orders === undefined
          : false,
    totalCount,
    filterOptions,
    exportOrders,
    async createOrder(values: ProcurementFormValues) {
      if (!orgId) return
      await createOrderMutation({
        clerkOrgId: orgId,
        type: "PURCHASE_ORDER",
        supplierId: values.supplierId as Id<"suppliers">,
        status: mapPurchaseStatus(values.status),
        channel: mapChannel(values.channel),
        orderDate: parseDate(values.orderDate),
        totalAmount: values.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
        items: values.items.map((item) => ({
          productId: item.productId as Id<"products">,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      })
    },
    async updateOrder(order: PurchaseOrder, values: ProcurementFormValues) {
      if (!orgId) return
      await updateOrderMutation({
        clerkOrgId: orgId,
        id: order.id as Id<"procurementOrders">,
        supplierId: values.supplierId as Id<"suppliers">,
        status: mapPurchaseStatus(values.status),
        channel: mapChannel(values.channel),
        orderDate: parseDate(values.orderDate),
        totalAmount: values.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
        items: values.items.map((item) => ({
          productId: item.productId as Id<"products">,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      })
    },
    async removeOrder(order: PurchaseOrder) {
      if (!orgId) return
      await removeOrderMutation({
        clerkOrgId: orgId,
        id: order.id as Id<"procurementOrders">,
      })
    },
  }
}

export function useDeliveryNotes(options?: ProcurementListOptions) {
  const { isLoaded, orgId, userId } = useAuth()
  const { organization } = useOrganization()
  const ensurePharmacy = useMutation(api.pharmacies.ensureForOrg)
  const orgName = organization?.name ?? "Pharmacie"
  const convex = useConvex()
  const mode = options?.mode ?? "all"
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 10
  const listFilters = React.useMemo(
    () => ({
      supplierNames: options?.filters?.supplierNames ?? [],
      statuses: options?.filters?.statuses ?? [],
      references: options?.filters?.references ?? [],
      orderFrom: options?.filters?.orderFrom,
      orderTo: options?.filters?.orderTo,
      createdFrom: options?.filters?.createdFrom,
      createdTo: options?.filters?.createdTo,
    }),
    [
      options?.filters?.createdFrom,
      options?.filters?.createdTo,
      options?.filters?.orderFrom,
      options?.filters?.orderTo,
      options?.filters?.references,
      options?.filters?.statuses,
      options?.filters?.supplierNames,
    ]
  )
  const createOrderMutation = useMutation(api.procurement.create)
  const updateOrderMutation = useMutation(api.procurement.update)
  const removeOrderMutation = useMutation(api.procurement.remove)

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])

  const pagedResponse = useQuery(
    api.procurement.listByOrgPaginated,
    orgId && mode === "paged"
      ? {
          clerkOrgId: orgId,
          type: "DELIVERY_NOTE",
          pagination: { page, pageSize },
          filters: listFilters,
        }
      : "skip"
  ) as ProcurementListResponse | undefined

  const notes = useQuery(
    api.procurement.listByOrg,
    orgId && mode === "all" ? { clerkOrgId: orgId, type: "DELIVERY_NOTE" } : "skip"
  ) as ProcurementOrder[] | undefined

  const mappedNotes = React.useMemo(() => {
    const source = mode === "paged" ? pagedResponse?.items : notes
    if (!source) return []
    const fallbackNumbers =
      mode === "paged"
        ? new Map(Object.entries(pagedResponse?.fallbackNumbers ?? {}))
        : buildFallbackNumbers(source, ORDER_PREFIXES.DELIVERY_NOTE)
    return source.map((note) => mapDeliveryNote(note, fallbackNumbers.get(note.id)))
  }, [mode, notes, pagedResponse?.fallbackNumbers, pagedResponse?.items])

  const filterOptions = React.useMemo(() => {
    if (mode === "paged") {
      return pagedResponse?.filterOptions ?? { suppliers: [], references: [] }
    }
    if (!notes) return { suppliers: [], references: [] }
    return {
      suppliers: Array.from(new Set(notes.map((note) => note.supplierName))),
      references: Array.from(new Set(notes.map((note) => note.externalReference ?? "-"))),
    }
  }, [mode, notes, pagedResponse?.filterOptions])

  const totalCount = mode === "paged" ? (pagedResponse?.totalCount ?? 0) : mappedNotes.length

  const exportNotes = React.useCallback(async () => {
    if (!orgId) return []
    if (mode !== "paged") {
      return mappedNotes
    }
    const exportCount = pagedResponse?.totalCount ?? 0
    if (!exportCount) return []
    const response = (await convex.query(api.procurement.listByOrgPaginated, {
      clerkOrgId: orgId,
      type: "DELIVERY_NOTE",
      pagination: { page: 1, pageSize: exportCount },
      filters: listFilters,
    })) as ProcurementListResponse
    const fallbackNumbers = new Map(Object.entries(response.fallbackNumbers ?? {}))
    return response.items.map((note) => mapDeliveryNote(note, fallbackNumbers.get(note.id)))
  }, [convex, listFilters, mappedNotes, mode, orgId, pagedResponse?.totalCount])

  return {
    notes: mappedNotes,
    isLoading:
      mode === "paged" ? pagedResponse === undefined : mode === "all" ? notes === undefined : false,
    totalCount,
    filterOptions,
    exportNotes,
    async createNote(values: ProcurementFormValues) {
      if (!orgId) return
      await createOrderMutation({
        clerkOrgId: orgId,
        type: "DELIVERY_NOTE",
        supplierId: values.supplierId as Id<"suppliers">,
        status: mapDeliveryStatus(values.status),
        channel: mapChannel(values.channel),
        orderDate: parseDate(values.orderDate),
        totalAmount: values.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
        externalReference: values.externalReference || undefined,
        items: values.items.map((item) => ({
          productId: item.productId as Id<"products">,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      })
    },
    async updateNote(note: DeliveryNote, values: ProcurementFormValues) {
      if (!orgId) return
      await updateOrderMutation({
        clerkOrgId: orgId,
        id: note.id as Id<"procurementOrders">,
        supplierId: values.supplierId as Id<"suppliers">,
        status: mapDeliveryStatus(values.status),
        channel: mapChannel(values.channel),
        orderDate: parseDate(values.orderDate),
        totalAmount: values.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
        externalReference: values.externalReference || undefined,
        items: values.items.map((item) => ({
          productId: item.productId as Id<"products">,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      })
    },
    async removeNote(note: DeliveryNote) {
      if (!orgId) return
      await removeOrderMutation({
        clerkOrgId: orgId,
        id: note.id as Id<"procurementOrders">,
      })
    },
  }
}
