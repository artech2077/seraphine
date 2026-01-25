"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useConvex, useMutation, useQuery } from "convex/react"

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
  createdAt?: number
  saleNumber?: string
  saleSequence?: number
  paymentMethod: "CASH" | "CARD" | "CHECK" | "CREDIT"
  totalAmountTtc: number
  globalDiscountType?: "PERCENT" | "AMOUNT"
  globalDiscountValue?: number
  clientName?: string
  sellerName?: string
  items: SaleItemRecord[]
}

type SalesListFilters = {
  from?: number
  to?: number
  clients?: string[]
  sellers?: string[]
  products?: string[]
  payments?: string[]
  discountOnly?: boolean
}

type SalesListOptions = {
  mode?: "all" | "paged" | "mutations"
  page?: number
  pageSize?: number
  filters?: SalesListFilters
}

type SalesListResponse = {
  items: SaleRecord[]
  totalCount: number
  filterOptions: {
    clients: string[]
    sellers: string[]
    products: string[]
  }
  fallbackNumbers: Record<string, string>
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

const SALE_NUMBER_PREFIX = "FAC-"

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

function formatSaleNumber(sequence: number) {
  return `${SALE_NUMBER_PREFIX}${String(sequence).padStart(2, "0")}`
}

function parseSaleNumber(value?: string | null) {
  if (!value) return null
  const match = value.match(/^FAC-(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

function mapSaleToHistory(sale: SaleRecord, fallbackNumber?: string): SaleHistoryItem {
  const saleNumber =
    sale.saleNumber ??
    (sale.saleSequence ? formatSaleNumber(sale.saleSequence) : undefined) ??
    fallbackNumber ??
    formatSaleNumber(1)
  return {
    id: String(sale._id),
    saleNumber,
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

export function useSalesHistory(options?: SalesListOptions) {
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
      from: options?.filters?.from,
      to: options?.filters?.to,
      clients: options?.filters?.clients ?? [],
      sellers: options?.filters?.sellers ?? [],
      products: options?.filters?.products ?? [],
      payments: options?.filters?.payments ?? [],
      discountOnly: options?.filters?.discountOnly ?? false,
    }),
    [
      options?.filters?.clients,
      options?.filters?.discountOnly,
      options?.filters?.from,
      options?.filters?.payments,
      options?.filters?.products,
      options?.filters?.sellers,
      options?.filters?.to,
    ]
  )

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])

  const pagedResponse = useQuery(
    api.sales.listByOrgPaginated,
    orgId && mode === "paged"
      ? { clerkOrgId: orgId, pagination: { page, pageSize }, filters: listFilters }
      : "skip"
  ) as SalesListResponse | undefined

  const records = useQuery(
    api.sales.listByOrg,
    orgId && mode === "all" ? { clerkOrgId: orgId } : "skip"
  ) as SaleRecord[] | undefined

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

  const items = React.useMemo(() => {
    const source = mode === "paged" ? pagedResponse?.items : records
    if (!source) return []

    const fallbackNumbers =
      mode === "paged"
        ? new Map(Object.entries(pagedResponse?.fallbackNumbers ?? {}))
        : (() => {
            const usedSequences = new Set<number>()
            source.forEach((sale) => {
              const sequence = sale.saleSequence ?? parseSaleNumber(sale.saleNumber)
              if (sequence) {
                usedSequences.add(sequence)
              }
            })

            const generated = new Map<string, string>()
            const missing = [...source]
              .filter((sale) => !sale.saleNumber && !sale.saleSequence)
              .sort((a, b) => {
                const dateA = a.createdAt ?? a.saleDate
                const dateB = b.createdAt ?? b.saleDate
                return dateA - dateB
              })

            let nextSequence = 1
            missing.forEach((sale) => {
              while (usedSequences.has(nextSequence)) {
                nextSequence += 1
              }
              generated.set(String(sale._id), formatSaleNumber(nextSequence))
              usedSequences.add(nextSequence)
              nextSequence += 1
            })

            return generated
          })()

    return source.map((sale) => mapSaleToHistory(sale, fallbackNumbers.get(String(sale._id))))
  }, [mode, pagedResponse?.fallbackNumbers, pagedResponse?.items, records])

  const filterOptions = React.useMemo(() => {
    if (mode === "paged") {
      return pagedResponse?.filterOptions ?? { clients: [], sellers: [], products: [] }
    }
    if (!records) return { clients: [], sellers: [], products: [] }
    const clients = Array.from(new Set(records.map((sale) => sale.clientName ?? "-")))
    const sellers = Array.from(new Set(records.map((sale) => sale.sellerName ?? "-")))
    const productSet = new Set<string>()
    records.forEach((sale) =>
      sale.items.forEach((item) => productSet.add(item.productNameSnapshot))
    )
    return { clients, sellers, products: Array.from(productSet) }
  }, [mode, pagedResponse?.filterOptions, records])

  const totalCount = mode === "paged" ? (pagedResponse?.totalCount ?? 0) : items.length

  const exportSales = React.useCallback(async () => {
    if (!orgId) return []
    if (mode !== "paged") {
      return items
    }
    const exportCount = pagedResponse?.totalCount ?? 0
    if (!exportCount) return []

    const response = (await convex.query(api.sales.listByOrgPaginated, {
      clerkOrgId: orgId,
      pagination: { page: 1, pageSize: exportCount },
      filters: listFilters,
    })) as SalesListResponse

    const fallbackNumbers = new Map(Object.entries(response.fallbackNumbers ?? {}))
    return response.items.map((sale) =>
      mapSaleToHistory(sale, fallbackNumbers.get(String(sale._id)))
    )
  }, [convex, items, listFilters, mode, orgId, pagedResponse?.totalCount])

  return {
    items,
    isLoading:
      mode === "paged"
        ? pagedResponse === undefined
        : mode === "all"
          ? records === undefined
          : false,
    totalCount,
    filterOptions,
    exportSales,
    createSale,
    removeSale,
  }
}
