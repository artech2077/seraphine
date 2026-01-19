"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"

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

function mapPurchaseOrder(order: ProcurementOrder): PurchaseOrder {
  return {
    id: String(order.id),
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

function mapDeliveryNote(order: ProcurementOrder): DeliveryNote {
  return {
    id: String(order.id),
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

export function usePurchaseOrders() {
  const { isLoaded, orgId, userId } = useAuth()
  const { organization } = useOrganization()
  const ensurePharmacy = useMutation(api.pharmacies.ensureForOrg)
  const orgName = organization?.name ?? "Pharmacie"
  const createOrderMutation = useMutation(api.procurement.create)
  const updateOrderMutation = useMutation(api.procurement.update)
  const removeOrderMutation = useMutation(api.procurement.remove)

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])

  const orders = useQuery(
    api.procurement.listByOrg,
    orgId ? { clerkOrgId: orgId, type: "PURCHASE_ORDER" } : "skip"
  ) as ProcurementOrder[] | undefined

  return {
    orders: orders ? orders.map(mapPurchaseOrder) : [],
    isLoading: orders === undefined,
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

export function useDeliveryNotes() {
  const { isLoaded, orgId, userId } = useAuth()
  const { organization } = useOrganization()
  const ensurePharmacy = useMutation(api.pharmacies.ensureForOrg)
  const orgName = organization?.name ?? "Pharmacie"
  const createOrderMutation = useMutation(api.procurement.create)
  const updateOrderMutation = useMutation(api.procurement.update)
  const removeOrderMutation = useMutation(api.procurement.remove)

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])

  const notes = useQuery(
    api.procurement.listByOrg,
    orgId ? { clerkOrgId: orgId, type: "DELIVERY_NOTE" } : "skip"
  ) as ProcurementOrder[] | undefined

  return {
    notes: notes ? notes.map(mapDeliveryNote) : [],
    isLoading: notes === undefined,
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
