"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useConvex, useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { DeliveryNote, PurchaseOrder } from "@/features/achats/procurement-data"
import { useStableQuery } from "@/hooks/use-stable-query"

type DiscountType = "percent" | "amount"

export type ProcurementLineInput = {
  productId: string
  quantity: number
  unitPrice: number
  lineDiscountType?: DiscountType
  lineDiscountValue?: number
  lots?: Array<{
    lotNumber: string
    expiryDate: string
    quantity: number
  }>
}

export type ProcurementFormValues = {
  supplierId: string
  channel: string
  status: string
  orderDate: string
  dueDate?: string
  externalReference?: string
  globalDiscountType?: DiscountType
  globalDiscountValue?: number
  items: ProcurementLineInput[]
}

type ProcurementItem = {
  id: string
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
  lineDiscountType?: "PERCENT" | "AMOUNT" | null
  lineDiscountValue?: number | null
  lineTotal?: number | null
  lots?: Array<{
    lotNumber: string
    expiryDate: number
    quantity: number
  }>
}

type ProcurementOrder = {
  id: string
  orderNumber?: string | null
  orderSequence?: number | null
  supplierId?: string
  supplierName: string
  channel: "EMAIL" | "PHONE" | null
  createdAt: number
  orderDate: number
  dueDate?: number | null
  totalAmount: number
  status: "DRAFT" | "ORDERED" | "IN_PROGRESS" | "DELIVERED"
  type: "PURCHASE_ORDER" | "DELIVERY_NOTE"
  externalReference: string | null
  globalDiscountType?: "PERCENT" | "AMOUNT" | null
  globalDiscountValue?: number | null
  items: ProcurementItem[]
}

type ProcurementListFilters = {
  supplierNames?: string[]
  statuses?: Array<"DRAFT" | "ORDERED" | "IN_PROGRESS" | "DELIVERED">
  references?: string[]
  orderFrom?: number
  orderTo?: number
  dueFrom?: number
  dueTo?: number
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
  IN_PROGRESS: "Commandé",
  DELIVERED: "Commandé",
}

const deliveryStatusLabels: Record<string, DeliveryNote["status"]> = {
  DRAFT: "Brouillon",
  ORDERED: "Commandé",
  IN_PROGRESS: "En cours",
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

function parseOptionalDate(value?: string) {
  if (!value) return undefined
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function parseLotExpiryDate(value: string) {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

type ProcurementChannel = "EMAIL" | "PHONE"
type ProcurementStatus = "DRAFT" | "ORDERED" | "IN_PROGRESS" | "DELIVERED"
type DiscountTypeApi = "PERCENT" | "AMOUNT"

function mapChannel(value?: string): ProcurementChannel | undefined {
  if (value === "Email") return "EMAIL"
  if (value === "Téléphone") return "PHONE"
  return undefined
}

function mapPurchaseStatus(value: string): ProcurementStatus {
  switch (value) {
    case "Commandé":
      return "ORDERED"
    default:
      return "DRAFT"
  }
}

function mapDiscountType(value?: DiscountType): DiscountTypeApi {
  if (value === "amount") return "AMOUNT"
  return "PERCENT"
}

function mapDiscountTypeFromApi(value?: DiscountTypeApi | null) {
  if (value === "AMOUNT") return "amount"
  if (value === "PERCENT") return "percent"
  return undefined
}

function calculateLineTotal(item: ProcurementLineInput) {
  const subtotal = item.quantity * item.unitPrice
  const discountValue = item.lineDiscountValue ?? 0
  const discount =
    mapDiscountType(item.lineDiscountType) === "PERCENT"
      ? (subtotal * discountValue) / 100
      : discountValue
  return Math.max(0, subtotal - discount)
}

function calculateTotals(values: ProcurementFormValues) {
  const lineTotals = values.items.map((item) => calculateLineTotal(item))
  const subtotal = lineTotals.reduce((sum, total) => sum + total, 0)
  const globalDiscountValue = values.globalDiscountValue ?? 0
  const globalDiscount =
    mapDiscountType(values.globalDiscountType) === "PERCENT"
      ? (subtotal * globalDiscountValue) / 100
      : globalDiscountValue
  return Math.max(0, subtotal - globalDiscount)
}

function normalizePurchaseOrderValues(values: ProcurementFormValues): ProcurementFormValues {
  return {
    ...values,
    dueDate: undefined,
    externalReference: undefined,
    globalDiscountType: undefined,
    globalDiscountValue: 0,
    items: values.items.map((item) => ({
      ...item,
      lineDiscountType: undefined,
      lineDiscountValue: 0,
      lots: undefined,
    })),
  }
}

function mapDeliveryStatus(value: string): ProcurementStatus {
  switch (value) {
    case "Commandé":
      return "ORDERED"
    case "En cours":
      return "IN_PROGRESS"
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
    supplierId: order.supplierId,
    supplier: order.supplierName,
    channel: channelLabels[order.channel ?? ""] ?? "Portail",
    createdAt: formatDate(order.createdAt),
    orderDate: formatDate(order.orderDate),
    dueDate: order.dueDate ? formatDate(order.dueDate) : undefined,
    total: order.totalAmount,
    status: purchaseStatusLabels[order.status] ?? "Brouillon",
    globalDiscountType: mapDiscountTypeFromApi(order.globalDiscountType),
    globalDiscountValue: order.globalDiscountValue ?? undefined,
    items: order.items.map((item) => ({
      id: String(item.id),
      productId: item.productId,
      product: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscountType: mapDiscountTypeFromApi(item.lineDiscountType),
      lineDiscountValue: item.lineDiscountValue ?? undefined,
      lots: (item.lots ?? []).map((lot) => ({
        lotNumber: lot.lotNumber,
        expiryDate: formatDate(lot.expiryDate),
        quantity: lot.quantity,
      })),
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
    supplierId: order.supplierId,
    supplier: order.supplierName,
    channel: channelLabels[order.channel ?? ""] ?? "Portail",
    createdAt: formatDate(order.createdAt),
    orderDate: formatDate(order.orderDate),
    dueDate: order.dueDate ? formatDate(order.dueDate) : undefined,
    externalReference: order.externalReference ?? "-",
    total: order.totalAmount,
    status: deliveryStatusLabels[order.status] ?? "Brouillon",
    globalDiscountType: mapDiscountTypeFromApi(order.globalDiscountType),
    globalDiscountValue: order.globalDiscountValue ?? undefined,
    items: order.items.map((item) => ({
      id: String(item.id),
      productId: item.productId,
      product: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscountType: mapDiscountTypeFromApi(item.lineDiscountType),
      lineDiscountValue: item.lineDiscountValue ?? undefined,
      lots: (item.lots ?? []).map((lot) => ({
        lotNumber: lot.lotNumber,
        expiryDate: formatDate(lot.expiryDate),
        quantity: lot.quantity,
      })),
    })),
  }
}

export function usePurchaseOrderById(orderId?: string) {
  const { orgId } = useAuth()
  const orderQuery = useStableQuery(
    api.procurement.getById,
    orgId && orderId ? { clerkOrgId: orgId, id: orderId as Id<"procurementOrders"> } : "skip"
  ) as { data: ProcurementOrder | null | undefined; isLoading: boolean; isFetching: boolean }

  const order = React.useMemo(() => {
    if (!orderQuery.data || orderQuery.data.type !== "PURCHASE_ORDER") return null
    return mapPurchaseOrder(orderQuery.data)
  }, [orderQuery.data])

  return {
    order,
    isLoading: orderQuery.isLoading,
    isFetching: orderQuery.isFetching,
  }
}

export function useDeliveryNoteById(noteId?: string) {
  const { orgId } = useAuth()
  const orderQuery = useStableQuery(
    api.procurement.getById,
    orgId && noteId ? { clerkOrgId: orgId, id: noteId as Id<"procurementOrders"> } : "skip"
  ) as { data: ProcurementOrder | null | undefined; isLoading: boolean; isFetching: boolean }

  const note = React.useMemo(() => {
    if (!orderQuery.data || orderQuery.data.type !== "DELIVERY_NOTE") return null
    return mapDeliveryNote(orderQuery.data)
  }, [orderQuery.data])

  return {
    note,
    isLoading: orderQuery.isLoading,
    isFetching: orderQuery.isFetching,
  }
}

export function usePurchaseOrders(options?: ProcurementListOptions) {
  const { orgId } = useAuth()
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
      dueFrom: options?.filters?.dueFrom,
      dueTo: options?.filters?.dueTo,
      createdFrom: options?.filters?.createdFrom,
      createdTo: options?.filters?.createdTo,
    }),
    [
      options?.filters?.createdFrom,
      options?.filters?.createdTo,
      options?.filters?.dueFrom,
      options?.filters?.dueTo,
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

  const pagedResponseQuery = useStableQuery(
    api.procurement.listByOrgPaginated,
    orgId && mode === "paged"
      ? {
          clerkOrgId: orgId,
          type: "PURCHASE_ORDER",
          pagination: { page, pageSize },
          filters: listFilters,
        }
      : "skip"
  ) as { data: ProcurementListResponse | undefined; isLoading: boolean; isFetching: boolean }
  const pagedResponse = pagedResponseQuery.data

  const ordersQuery = useStableQuery(
    api.procurement.listByOrg,
    orgId && mode === "all" ? { clerkOrgId: orgId, type: "PURCHASE_ORDER" } : "skip"
  ) as { data: ProcurementOrder[] | undefined; isLoading: boolean; isFetching: boolean }
  const orders = ordersQuery.data

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
        ? pagedResponseQuery.isLoading
        : mode === "all"
          ? ordersQuery.isLoading
          : false,
    isFetching:
      mode === "paged"
        ? pagedResponseQuery.isFetching
        : mode === "all"
          ? ordersQuery.isFetching
          : false,
    totalCount,
    filterOptions,
    exportOrders,
    async createOrder(values: ProcurementFormValues) {
      if (!orgId) return
      const normalizedValues = normalizePurchaseOrderValues(values)
      const payload = {
        clerkOrgId: orgId,
        type: "PURCHASE_ORDER" as const,
        supplierId: normalizedValues.supplierId as Id<"suppliers">,
        status: mapPurchaseStatus(normalizedValues.status),
        channel: mapChannel(normalizedValues.channel),
        orderDate: parseDate(normalizedValues.orderDate),
        dueDate: undefined,
        globalDiscountType: undefined,
        globalDiscountValue: 0,
        totalAmount: calculateTotals(normalizedValues),
        items: normalizedValues.items.map((item) => ({
          productId: item.productId as Id<"products">,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: undefined,
          lineDiscountValue: 0,
          lots: undefined,
        })),
      }
      await createOrderMutation(payload)
    },
    async updateOrder(order: PurchaseOrder, values: ProcurementFormValues) {
      if (!orgId) return
      const normalizedValues = normalizePurchaseOrderValues(values)
      const payload = {
        clerkOrgId: orgId,
        id: order.id as Id<"procurementOrders">,
        supplierId: normalizedValues.supplierId as Id<"suppliers">,
        status: mapPurchaseStatus(normalizedValues.status),
        channel: mapChannel(normalizedValues.channel),
        orderDate: parseDate(normalizedValues.orderDate),
        dueDate: undefined,
        globalDiscountType: undefined,
        globalDiscountValue: 0,
        totalAmount: calculateTotals(normalizedValues),
        items: normalizedValues.items.map((item) => ({
          productId: item.productId as Id<"products">,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: undefined,
          lineDiscountValue: 0,
          lots: undefined,
        })),
      }
      await updateOrderMutation(payload)
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
  const { orgId } = useAuth()
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
      dueFrom: options?.filters?.dueFrom,
      dueTo: options?.filters?.dueTo,
      createdFrom: options?.filters?.createdFrom,
      createdTo: options?.filters?.createdTo,
    }),
    [
      options?.filters?.createdFrom,
      options?.filters?.createdTo,
      options?.filters?.dueFrom,
      options?.filters?.dueTo,
      options?.filters?.orderFrom,
      options?.filters?.orderTo,
      options?.filters?.references,
      options?.filters?.statuses,
      options?.filters?.supplierNames,
    ]
  )
  const createOrderMutation = useMutation(api.procurement.create)
  const createFromPurchaseMutation = useMutation(api.procurement.createDeliveryFromPurchase)
  const updateOrderMutation = useMutation(api.procurement.update)
  const removeOrderMutation = useMutation(api.procurement.remove)

  const pagedResponseQuery = useStableQuery(
    api.procurement.listByOrgPaginated,
    orgId && mode === "paged"
      ? {
          clerkOrgId: orgId,
          type: "DELIVERY_NOTE",
          pagination: { page, pageSize },
          filters: listFilters,
        }
      : "skip"
  ) as { data: ProcurementListResponse | undefined; isLoading: boolean; isFetching: boolean }
  const pagedResponse = pagedResponseQuery.data

  const notesQuery = useStableQuery(
    api.procurement.listByOrg,
    orgId && mode === "all" ? { clerkOrgId: orgId, type: "DELIVERY_NOTE" } : "skip"
  ) as { data: ProcurementOrder[] | undefined; isLoading: boolean; isFetching: boolean }
  const notes = notesQuery.data

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
      mode === "paged"
        ? pagedResponseQuery.isLoading
        : mode === "all"
          ? notesQuery.isLoading
          : false,
    isFetching:
      mode === "paged"
        ? pagedResponseQuery.isFetching
        : mode === "all"
          ? notesQuery.isFetching
          : false,
    totalCount,
    filterOptions,
    exportNotes,
    async createFromPurchase(order: PurchaseOrder) {
      if (!orgId) return undefined
      const deliveryId = await createFromPurchaseMutation({
        clerkOrgId: orgId,
        purchaseOrderId: order.id as Id<"procurementOrders">,
      })
      return String(deliveryId)
    },
    async createNote(values: ProcurementFormValues) {
      if (!orgId) return
      const payload = {
        clerkOrgId: orgId,
        type: "DELIVERY_NOTE" as const,
        supplierId: values.supplierId as Id<"suppliers">,
        status: mapDeliveryStatus(values.status),
        channel: mapChannel(values.channel),
        orderDate: parseDate(values.orderDate),
        dueDate: parseOptionalDate(values.dueDate),
        globalDiscountType: mapDiscountType(values.globalDiscountType),
        globalDiscountValue: values.globalDiscountValue ?? 0,
        totalAmount: calculateTotals(values),
        externalReference: values.externalReference || undefined,
        items: values.items.map((item) => ({
          productId: item.productId as Id<"products">,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: mapDiscountType(item.lineDiscountType),
          lineDiscountValue: item.lineDiscountValue ?? 0,
          lots: item.lots?.map((lot) => ({
            lotNumber: lot.lotNumber,
            expiryDate: parseLotExpiryDate(lot.expiryDate),
            quantity: lot.quantity,
          })),
        })),
      }
      await createOrderMutation(payload)
    },
    async updateNote(note: DeliveryNote, values: ProcurementFormValues) {
      if (!orgId) return
      const payload = {
        clerkOrgId: orgId,
        id: note.id as Id<"procurementOrders">,
        supplierId: values.supplierId as Id<"suppliers">,
        status: mapDeliveryStatus(values.status),
        channel: mapChannel(values.channel),
        orderDate: parseDate(values.orderDate),
        dueDate: parseOptionalDate(values.dueDate),
        globalDiscountType: mapDiscountType(values.globalDiscountType),
        globalDiscountValue: values.globalDiscountValue ?? 0,
        totalAmount: calculateTotals(values),
        externalReference: values.externalReference || undefined,
        items: values.items.map((item) => ({
          productId: item.productId as Id<"products">,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineDiscountType: mapDiscountType(item.lineDiscountType),
          lineDiscountValue: item.lineDiscountValue ?? 0,
          lots: item.lots?.map((lot) => ({
            lotNumber: lot.lotNumber,
            expiryDate: parseLotExpiryDate(lot.expiryDate),
            quantity: lot.quantity,
          })),
        })),
      }
      await updateOrderMutation(payload)
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
