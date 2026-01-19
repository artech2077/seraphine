"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { SaleHistoryItem } from "@/features/ventes/sales-history-table"

type SaleItemRecord = {
  _id: Id<"saleItems">
  productNameSnapshot: string
  quantity: number
  unitPriceHt: number
  vatRate: number
  lineDiscountType?: "PERCENT" | "AMOUNT"
  lineDiscountValue?: number
  totalLineTtc: number
}

type SaleRecord = {
  _id: Id<"sales">
  saleDate: number
  paymentMethod: "CASH" | "CARD" | "CHECK" | "CREDIT"
  totalAmountTtc: number
  globalDiscountType?: "PERCENT" | "AMOUNT"
  globalDiscountValue?: number
  clientName?: string
  sellerName?: string
  items: SaleItemRecord[]
}

export type SaleLineInput = {
  productId: string
  productName: string
  quantity: number
  unitPriceHt: number
  vatRate: number
  discountType: "percent" | "amount"
  discountValue: number
}

export type SaleFormValues = {
  clientId?: string
  paymentMethod: "cash" | "card" | "credit" | "check"
  globalDiscountType?: "percent" | "amount"
  globalDiscountValue?: number
  lines: SaleLineInput[]
}

const paymentLabels: Record<SaleRecord["paymentMethod"], SaleHistoryItem["paymentMethod"]> = {
  CASH: "Espèce",
  CARD: "Carte",
  CHECK: "Carte",
  CREDIT: "Crédit",
}

function formatDate(value: number) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatDiscount(type?: "PERCENT" | "AMOUNT", value?: number, fallback = "-"): string {
  if (!type || !value) return fallback
  return type === "PERCENT" ? `${value}%` : `${value} MAD`
}

function mapSaleToHistory(sale: SaleRecord): SaleHistoryItem {
  return {
    id: String(sale._id),
    date: formatDate(sale.saleDate),
    client: sale.clientName ?? "-",
    seller: sale.sellerName ?? "-",
    paymentMethod: paymentLabels[sale.paymentMethod],
    globalDiscount: formatDiscount(sale.globalDiscountType, sale.globalDiscountValue),
    amountTtc: sale.totalAmountTtc,
    items: sale.items.map((item) => ({
      id: String(item._id),
      product: item.productNameSnapshot,
      quantity: item.quantity,
      unitPriceHt: item.unitPriceHt,
      vatRate: item.vatRate,
      discount: formatDiscount(item.lineDiscountType, item.lineDiscountValue),
      totalTtc: item.totalLineTtc,
    })),
  }
}

function mapPaymentMethod(value: SaleFormValues["paymentMethod"]) {
  switch (value) {
    case "card":
      return "CARD"
    case "credit":
      return "CREDIT"
    case "check":
      return "CHECK"
    default:
      return "CASH"
  }
}

function mapDiscountType(value?: "percent" | "amount") {
  if (!value) return undefined
  return value === "percent" ? "PERCENT" : "AMOUNT"
}

export function useSalesHistory() {
  const { isLoaded, orgId, userId } = useAuth()
  const { organization } = useOrganization()
  const ensurePharmacy = useMutation(api.pharmacies.ensureForOrg)
  const orgName = organization?.name ?? "Pharmacie"

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])

  const records = useQuery(api.sales.listByOrg, orgId ? { clerkOrgId: orgId } : "skip") as
    | SaleRecord[]
    | undefined

  const createMutation = useMutation(api.sales.create)
  const removeMutation = useMutation(api.sales.remove)

  async function createSale(values: SaleFormValues) {
    if (!orgId) return
    const lineTotals = values.lines.map((line) => {
      const lineSubtotalTtc = line.unitPriceHt * (1 + line.vatRate / 100) * line.quantity
      const discount =
        line.discountType === "percent"
          ? (lineSubtotalTtc * line.discountValue) / 100
          : line.discountValue
      return Math.max(0, lineSubtotalTtc - discount)
    })
    const totalBeforeGlobal = lineTotals.reduce((sum, value) => sum + value, 0)
    const globalDiscountType = mapDiscountType(values.globalDiscountType)
    const globalDiscountValue = values.globalDiscountValue ?? 0
    const globalDiscount =
      globalDiscountType === "PERCENT"
        ? (totalBeforeGlobal * globalDiscountValue) / 100
        : globalDiscountValue
    const totalAmountTtc = Math.max(0, totalBeforeGlobal - globalDiscount)

    await createMutation({
      clerkOrgId: orgId,
      saleDate: Date.now(),
      clientId: values.clientId ? (values.clientId as Id<"clients">) : undefined,
      paymentMethod: mapPaymentMethod(values.paymentMethod),
      globalDiscountType,
      globalDiscountValue: globalDiscountValue || undefined,
      totalAmountHt: values.lines.reduce((sum, line) => sum + line.unitPriceHt * line.quantity, 0),
      totalAmountTtc,
      items: values.lines.map((line, index) => ({
        productId: line.productId as Id<"products">,
        productNameSnapshot: line.productName,
        quantity: line.quantity,
        unitPriceHt: line.unitPriceHt,
        vatRate: line.vatRate,
        lineDiscountType: mapDiscountType(line.discountType),
        lineDiscountValue: line.discountValue || undefined,
        totalLineTtc: lineTotals[index],
      })),
    })
  }

  async function removeSale(item: SaleHistoryItem) {
    if (!orgId) return
    await removeMutation({
      clerkOrgId: orgId,
      id: item.id as Id<"sales">,
    })
  }

  const items = React.useMemo(() => (records ? records.map(mapSaleToHistory) : []), [records])

  return {
    items,
    isLoading: records === undefined,
    createSale,
    removeSale,
  }
}
