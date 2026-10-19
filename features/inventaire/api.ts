"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useConvex, useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { InventoryItem } from "@/features/inventaire/inventory-table"
import { useStableQuery } from "@/hooks/use-stable-query"

export type InventoryFormValues = {
  name: string
  barcode: string
  category: string
  dosageForm: string
  purchasePrice: number
  sellingPrice: number
  vatRate: number
  stock: number
  threshold: number
  notes?: string
}

export type ProductOption = {
  id: string
  name: string
  unitPrice: number
  sellingPrice: number
  vatRate: number
  barcode: string
  category: string
  stockQuantity: number
  lowStockThreshold: number
}

export type ProductCatalogItem = {
  id: string
  name: string
  barcode: string
  sellingPrice: number
  vatRate: number
  category: string
  stockQuantity: number
  lowStockThreshold: number
}

export type StockAdjustmentValues = {
  productId: string
  direction: "IN" | "OUT"
  quantity: number
  reason: string
  note?: string
}

export type ExpiryRiskWindow = 30 | 60 | 90

export type ExpiryRiskSeverity = "EXPIRED" | "CRITICAL" | "WARNING" | "WATCH"

export type ExpiryRiskItem = {
  lotId: string
  productId: string
  productName: string
  productCategory: string
  lotNumber: string
  expiryDate: number
  daysToExpiry: number
  quantity: number
  supplierId: string | null
  supplierName: string | null
  severity: ExpiryRiskSeverity
  recommendedAction: string
  recommendedPathLabel: string
  recommendedPathHref: string
  lotDetailPath: string
}

export type ExpiryRiskCounts = {
  total: number
  expired: number
  dueIn30Days: number
  dueIn60Days: number
  dueIn90Days: number
}

export type ExpiryRiskFilters = {
  productIds?: string[]
  categories?: string[]
  supplierIds?: string[]
  severities?: ExpiryRiskSeverity[]
}

export type LotTraceabilityTimelineEvent = {
  id: string
  createdAt: number
  eventType: "RECEPTION" | "SORTIE" | "RETOUR" | "MOUVEMENT"
  delta: number
  reason: string
  reference: string
}

export type LotTraceabilityItem = {
  lotId: string
  productId: string
  productName: string
  productCategory: string
  lotNumber: string
  expiryDate: number
  currentBalance: number
  receivedQuantity: number
  soldQuantity: number
  supplierId: string | null
  supplierName: string | null
  recallReportPath: string
  timeline: LotTraceabilityTimelineEvent[]
}

export type StocktakeStatus = "DRAFT" | "COUNTING" | "FINALIZED"

export type StocktakeSession = {
  id: string
  name: string
  status: StocktakeStatus
  createdAt: number
  startedAt: number | null
  finalizedAt: number | null
  itemsCount: number
  countedCount: number
  varianceCount: number
}

export type StocktakeSessionItem = {
  id: string
  productId: string
  productName: string
  expectedQuantity: number
  countedQuantity: number | null
  varianceQuantity: number | null
  note: string
}

export type StocktakeDetails = {
  id: string
  name: string
  status: StocktakeStatus
  createdAt: number
  startedAt: number | null
  finalizedAt: number | null
  items: StocktakeSessionItem[]
}

export type StocktakeCountInput = {
  productId: string
  countedQuantity: number
  note?: string
}

type InventoryListFilters = {
  names?: string[]
  barcodes?: string[]
  suppliers?: string[]
  categories?: string[]
  stockStatuses?: string[]
  vatRates?: number[]
}

type InventoryListOptions = {
  mode?: "all" | "paged"
  page?: number
  pageSize?: number
  filters?: InventoryListFilters
}

type InventoryListResponse = {
  items: InventoryProduct[]
  totalCount: number
  filterOptions: {
    names: string[]
    barcodes: string[]
    suppliers: string[]
    categories: string[]
  }
}

type ExpiryRiskResponse = {
  items: Array<{
    lotId: Id<"stockLots">
    productId: Id<"products">
    productName: string
    productCategory: string
    lotNumber: string
    expiryDate: number
    daysToExpiry: number
    quantity: number
    supplierId: Id<"suppliers"> | null
    supplierName: string | null
    severity: ExpiryRiskSeverity
    recommendedAction: string
    recommendedPathLabel: string
    recommendedPathHref: string
    lotDetailPath: string
  }>
  counts: ExpiryRiskCounts
  filterOptions: {
    products: Array<{ id: Id<"products">; name: string }>
    categories: string[]
    suppliers: Array<{ id: Id<"suppliers">; name: string }>
    severities: ExpiryRiskSeverity[]
  }
}

type LotTraceabilityResponse = {
  lotNumber: string
  items: Array<{
    lotId: Id<"stockLots">
    productId: Id<"products">
    productName: string
    productCategory: string
    lotNumber: string
    expiryDate: number
    currentBalance: number
    receivedQuantity: number
    soldQuantity: number
    supplierId: Id<"suppliers"> | null
    supplierName: string | null
    recallReportPath: string
    timeline: Array<{
      id: string
      createdAt: number
      eventType: "RECEPTION" | "SORTIE" | "RETOUR" | "MOUVEMENT"
      delta: number
      reason: string
      reference: string
    }>
  }>
}

const EMPTY_EXPIRY_RISK_RESPONSE: ExpiryRiskResponse = {
  items: [],
  counts: {
    total: 0,
    expired: 0,
    dueIn30Days: 0,
    dueIn60Days: 0,
    dueIn90Days: 0,
  },
  filterOptions: {
    products: [],
    categories: [],
    suppliers: [],
    severities: ["EXPIRED", "CRITICAL", "WARNING", "WATCH"],
  },
}

function isMissingPublicFunctionError(error: unknown) {
  return error instanceof Error && error.message.includes("Could not find public function")
}

type InventoryProduct = {
  _id: Id<"products">
  name: string
  barcode: string
  category: string
  purchasePrice: number
  sellingPrice: number
  vatRate: number
  stockQuantity: number
  lowStockThreshold: number
  dosageForm: string
}

function mapProductToInventoryItem(product: InventoryProduct): InventoryItem {
  return {
    id: product._id,
    name: product.name,
    barcode: product.barcode,
    stock: product.stockQuantity,
    threshold: product.lowStockThreshold,
    purchasePrice: product.purchasePrice,
    sellingPrice: product.sellingPrice,
    vatRate: product.vatRate,
    category: product.category,
    dosageForm: product.dosageForm,
  }
}

function mapProductToOption(product: InventoryProduct): ProductOption {
  return {
    id: product._id,
    name: product.name,
    unitPrice: product.purchasePrice,
    sellingPrice: product.sellingPrice,
    vatRate: product.vatRate,
    barcode: product.barcode,
    category: product.category,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
  }
}

function mapProductToCatalogItem(product: InventoryProduct): ProductCatalogItem {
  return {
    id: product._id,
    name: product.name,
    barcode: product.barcode,
    sellingPrice: product.sellingPrice,
    vatRate: product.vatRate,
    category: product.category,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
  }
}

function mapFormValuesToCreatePayload(orgId: string, values: InventoryFormValues) {
  return {
    clerkOrgId: orgId,
    name: values.name,
    barcode: values.barcode || undefined,
    category: values.category,
    purchasePrice: values.purchasePrice,
    sellingPrice: values.sellingPrice,
    vatRate: values.vatRate,
    stockQuantity: values.stock,
    lowStockThreshold: values.threshold,
    dosageForm: values.dosageForm,
    internalNotes: values.notes || undefined,
  }
}

function useProducts() {
  const { orgId } = useAuth()

  const productsQuery = useStableQuery(
    api.products.listByOrg,
    orgId ? { clerkOrgId: orgId } : "skip"
  ) as { data: InventoryProduct[] | undefined; isLoading: boolean; isFetching: boolean }
  const products = productsQuery.data

  return {
    products,
    isLoading: productsQuery.isLoading,
  }
}

export function useInventoryItems(options?: InventoryListOptions) {
  const { orgId } = useAuth()
  const convex = useConvex()
  const mode = options?.mode ?? "all"
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 10

  const listFilters = React.useMemo(
    () => ({
      names: options?.filters?.names ?? [],
      barcodes: options?.filters?.barcodes ?? [],
      suppliers: options?.filters?.suppliers ?? [],
      categories: options?.filters?.categories ?? [],
      stockStatuses: options?.filters?.stockStatuses ?? [],
      vatRates: options?.filters?.vatRates ?? [],
    }),
    [
      options?.filters?.barcodes,
      options?.filters?.categories,
      options?.filters?.names,
      options?.filters?.stockStatuses,
      options?.filters?.suppliers,
      options?.filters?.vatRates,
    ]
  )

  const pagedResponseQuery = useStableQuery(
    api.products.listByOrgPaginated,
    orgId && mode === "paged"
      ? { clerkOrgId: orgId, pagination: { page, pageSize }, filters: listFilters }
      : "skip"
  ) as { data: InventoryListResponse | undefined; isLoading: boolean; isFetching: boolean }
  const pagedResponse = pagedResponseQuery.data

  const productsQuery = useStableQuery(
    api.products.listByOrg,
    orgId && mode !== "paged" ? { clerkOrgId: orgId } : "skip"
  ) as { data: InventoryProduct[] | undefined; isLoading: boolean; isFetching: boolean }
  const products = productsQuery.data

  const isLoading = mode === "paged" ? pagedResponseQuery.isLoading : productsQuery.isLoading
  const isFetching = mode === "paged" ? pagedResponseQuery.isFetching : productsQuery.isFetching
  const createProductMutation = useMutation(api.products.create)
  const updateProductMutation = useMutation(api.products.update)
  const removeProductMutation = useMutation(api.products.remove)
  const adjustStockMutation = useMutation(api.products.adjustStock)

  const items = React.useMemo(() => {
    const source = mode === "paged" ? pagedResponse?.items : products
    if (!source) return []
    return source.map(mapProductToInventoryItem)
  }, [mode, pagedResponse?.items, products])

  const filterOptions = React.useMemo(() => {
    if (mode === "paged") {
      return (
        pagedResponse?.filterOptions ?? {
          names: [],
          barcodes: [],
          suppliers: [],
          categories: [],
        }
      )
    }
    if (!products) {
      return { names: [], barcodes: [], suppliers: [], categories: [] }
    }
    const names = Array.from(new Set(products.map((product) => product.name)))
    const barcodes = Array.from(
      new Set(
        products
          .map((product) => product.barcode)
          .filter((barcode): barcode is string => Boolean(barcode))
      )
    )
    if (!barcodes.includes("Sans code barre")) {
      barcodes.push("Sans code barre")
    }
    const categories = Array.from(new Set(products.map((product) => product.category)))
    return { names, barcodes, suppliers: [], categories }
  }, [mode, pagedResponse?.filterOptions, products])

  const totalCount = mode === "paged" ? (pagedResponse?.totalCount ?? 0) : items.length

  return {
    items,
    isLoading,
    isFetching,
    hasOrg: Boolean(orgId),
    totalCount,
    filterOptions,
    exportInventory: React.useCallback(async () => {
      if (!orgId) return []
      if (mode !== "paged") {
        return items
      }
      const exportCount = pagedResponse?.totalCount ?? 0
      if (!exportCount) return []
      const response = (await convex.query(api.products.listByOrgPaginated, {
        clerkOrgId: orgId,
        pagination: { page: 1, pageSize: exportCount },
        filters: listFilters,
      })) as InventoryListResponse
      return response.items.map(mapProductToInventoryItem)
    }, [convex, items, listFilters, mode, orgId, pagedResponse?.totalCount]),
    async createProduct(values: InventoryFormValues) {
      if (!orgId) return
      await createProductMutation(mapFormValuesToCreatePayload(orgId, values))
    },
    async createProductsBatch(values: InventoryFormValues[]) {
      if (!orgId || values.length === 0) return
      await Promise.all(
        values.map((value) => createProductMutation(mapFormValuesToCreatePayload(orgId, value)))
      )
    },
    async updateProduct(item: InventoryItem, values: InventoryFormValues) {
      if (!orgId) return
      await updateProductMutation({
        clerkOrgId: orgId,
        id: item.id as Id<"products">,
        name: values.name,
        barcode: values.barcode || undefined,
        category: values.category,
        purchasePrice: values.purchasePrice,
        sellingPrice: values.sellingPrice,
        vatRate: values.vatRate,
        stockQuantity: values.stock,
        lowStockThreshold: values.threshold,
        dosageForm: values.dosageForm,
        internalNotes: values.notes || undefined,
      })
    },
    async removeProduct(item: InventoryItem) {
      if (!orgId) return
      await removeProductMutation({
        clerkOrgId: orgId,
        id: item.id as Id<"products">,
      })
    },
    async adjustStock(values: StockAdjustmentValues) {
      if (!orgId) return null
      return adjustStockMutation({
        clerkOrgId: orgId,
        productId: values.productId as Id<"products">,
        direction: values.direction,
        quantity: values.quantity,
        reason: values.reason,
        note: values.note?.trim() || undefined,
      })
    },
  }
}

export function useProductOptions() {
  const { products, isLoading } = useProducts()

  const options = React.useMemo(() => {
    if (!products) return []
    return products.map(mapProductToOption)
  }, [products])

  return {
    options,
    isLoading,
  }
}

export function useProductCatalog() {
  const { products, isLoading } = useProducts()

  const items = React.useMemo(() => {
    if (!products) return []
    return products.map(mapProductToCatalogItem)
  }, [products])

  return {
    items,
    isLoading,
  }
}

export function useExpiryRiskAlerts(options?: {
  windowDays?: ExpiryRiskWindow
  filters?: ExpiryRiskFilters
}) {
  const { orgId } = useAuth()
  const convex = useConvex()
  const windowDays = options?.windowDays ?? 90

  const filters = React.useMemo(
    () => ({
      productIds: options?.filters?.productIds ?? [],
      categories: options?.filters?.categories ?? [],
      supplierIds: options?.filters?.supplierIds ?? [],
      severities: options?.filters?.severities ?? [],
    }),
    [
      options?.filters?.categories,
      options?.filters?.productIds,
      options?.filters?.severities,
      options?.filters?.supplierIds,
    ]
  )

  const [response, setResponse] = React.useState<ExpiryRiskResponse | undefined>(undefined)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isFetching, setIsFetching] = React.useState(false)
  const [isUnavailable, setIsUnavailable] = React.useState(false)
  const hasFetchedRef = React.useRef(false)

  React.useEffect(() => {
    if (!orgId) {
      hasFetchedRef.current = false
      setResponse(undefined)
      setIsLoading(false)
      setIsFetching(false)
      setIsUnavailable(false)
      return
    }

    let isCancelled = false
    if (hasFetchedRef.current) {
      setIsFetching(true)
    } else {
      setIsLoading(true)
    }

    void convex
      .query(api.stockLots.listExpiryRisk, {
        clerkOrgId: orgId,
        windowDays,
        filters: {
          productIds: filters.productIds.map((id) => id as Id<"products">),
          categories: filters.categories,
          supplierIds: filters.supplierIds.map((id) => id as Id<"suppliers">),
          severities: filters.severities,
        },
      })
      .then((next) => {
        if (isCancelled) return
        hasFetchedRef.current = true
        setResponse(next as ExpiryRiskResponse)
        setIsUnavailable(false)
      })
      .catch((error) => {
        if (isCancelled) return
        hasFetchedRef.current = true
        if (isMissingPublicFunctionError(error)) {
          setResponse(EMPTY_EXPIRY_RISK_RESPONSE)
          setIsUnavailable(true)
          return
        }
        console.error(error)
        setResponse(EMPTY_EXPIRY_RISK_RESPONSE)
      })
      .finally(() => {
        if (isCancelled) return
        setIsLoading(false)
        setIsFetching(false)
      })

    return () => {
      isCancelled = true
    }
  }, [convex, filters, orgId, windowDays])

  return {
    items: (response?.items ?? []).map(
      (item): ExpiryRiskItem => ({
        lotId: String(item.lotId),
        productId: String(item.productId),
        productName: item.productName,
        productCategory: item.productCategory,
        lotNumber: item.lotNumber,
        expiryDate: item.expiryDate,
        daysToExpiry: item.daysToExpiry,
        quantity: item.quantity,
        supplierId: item.supplierId ? String(item.supplierId) : null,
        supplierName: item.supplierName,
        severity: item.severity,
        recommendedAction: item.recommendedAction,
        recommendedPathLabel: item.recommendedPathLabel,
        recommendedPathHref: item.recommendedPathHref,
        lotDetailPath: item.lotDetailPath,
      })
    ),
    counts: response?.counts ?? {
      total: 0,
      expired: 0,
      dueIn30Days: 0,
      dueIn60Days: 0,
      dueIn90Days: 0,
    },
    filterOptions: {
      products: (response?.filterOptions.products ?? []).map((item) => ({
        id: String(item.id),
        name: item.name,
      })),
      categories: response?.filterOptions.categories ?? [],
      suppliers: (response?.filterOptions.suppliers ?? []).map((item) => ({
        id: String(item.id),
        name: item.name,
      })),
      severities: response?.filterOptions.severities ?? [],
    },
    isLoading,
    isFetching,
    isUnavailable,
    hasOrg: Boolean(orgId),
  }
}

export function useLotTraceabilityReport(lotNumber?: string) {
  const { orgId } = useAuth()
  const convex = useConvex()
  const normalizedLotNumber = lotNumber?.trim() ?? ""

  const [report, setReport] = React.useState<LotTraceabilityResponse | undefined>(undefined)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isFetching, setIsFetching] = React.useState(false)
  const [isUnavailable, setIsUnavailable] = React.useState(false)
  const hasFetchedRef = React.useRef(false)

  React.useEffect(() => {
    if (!orgId || !normalizedLotNumber) {
      hasFetchedRef.current = false
      setReport(undefined)
      setIsLoading(false)
      setIsFetching(false)
      setIsUnavailable(false)
      return
    }

    let isCancelled = false
    if (hasFetchedRef.current) {
      setIsFetching(true)
    } else {
      setIsLoading(true)
    }

    void convex
      .query(api.stockLots.getLotTraceabilityReport, {
        clerkOrgId: orgId,
        lotNumber: normalizedLotNumber,
      })
      .then((next) => {
        if (isCancelled) return
        hasFetchedRef.current = true
        setReport(next as LotTraceabilityResponse)
        setIsUnavailable(false)
      })
      .catch((error) => {
        if (isCancelled) return
        hasFetchedRef.current = true
        if (isMissingPublicFunctionError(error)) {
          setReport({
            lotNumber: normalizedLotNumber.toUpperCase(),
            items: [],
          })
          setIsUnavailable(true)
          return
        }
        console.error(error)
        setReport({
          lotNumber: normalizedLotNumber.toUpperCase(),
          items: [],
        })
      })
      .finally(() => {
        if (isCancelled) return
        setIsLoading(false)
        setIsFetching(false)
      })

    return () => {
      isCancelled = true
    }
  }, [convex, normalizedLotNumber, orgId])

  return {
    lotNumber: report?.lotNumber ?? normalizedLotNumber.toUpperCase(),
    items: (report?.items ?? []).map(
      (item): LotTraceabilityItem => ({
        lotId: String(item.lotId),
        productId: String(item.productId),
        productName: item.productName,
        productCategory: item.productCategory,
        lotNumber: item.lotNumber,
        expiryDate: item.expiryDate,
        currentBalance: item.currentBalance,
        receivedQuantity: item.receivedQuantity,
        soldQuantity: item.soldQuantity,
        supplierId: item.supplierId ? String(item.supplierId) : null,
        supplierName: item.supplierName,
        recallReportPath: item.recallReportPath,
        timeline: item.timeline.map((event) => ({
          id: event.id,
          createdAt: event.createdAt,
          eventType: event.eventType,
          delta: event.delta,
          reason: event.reason,
          reference: event.reference,
        })),
      })
    ),
    isLoading,
    isFetching,
    isUnavailable,
    hasOrg: Boolean(orgId),
  }
}

export function useStocktakeSessions(selectedSessionId?: string) {
  const { orgId } = useAuth()
  const convex = useConvex()
  const [sessions, setSessions] = React.useState<StocktakeSession[]>([])
  const [selectedSession, setSelectedSession] = React.useState<StocktakeDetails | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isFetching, setIsFetching] = React.useState(false)
  const [isUnavailable, setIsUnavailable] = React.useState(false)
  const hasFetchedSessionsRef = React.useRef(false)

  React.useEffect(() => {
    if (!orgId) {
      hasFetchedSessionsRef.current = false
      setSessions([])
      setSelectedSession(null)
      setIsLoading(false)
      setIsFetching(false)
      setIsUnavailable(false)
      return
    }

    let isCancelled = false
    if (hasFetchedSessionsRef.current) {
      setIsFetching(true)
    } else {
      setIsLoading(true)
    }

    void convex
      .query(api.stocktakes.listByOrg, { clerkOrgId: orgId })
      .then((next) => {
        if (isCancelled) return
        hasFetchedSessionsRef.current = true
        setSessions(next as StocktakeSession[])
        setIsUnavailable(false)
      })
      .catch((error) => {
        if (isCancelled) return
        hasFetchedSessionsRef.current = true
        if (isMissingPublicFunctionError(error)) {
          setSessions([])
          setSelectedSession(null)
          setIsUnavailable(true)
          return
        }
        console.error(error)
        setSessions([])
      })
      .finally(() => {
        if (isCancelled) return
        setIsLoading(false)
        setIsFetching(false)
      })

    return () => {
      isCancelled = true
    }
  }, [convex, orgId])

  React.useEffect(() => {
    if (!orgId || !selectedSessionId || isUnavailable) {
      setSelectedSession(null)
      return
    }

    let isCancelled = false
    setIsFetching(true)

    void convex
      .query(api.stocktakes.getById, {
        clerkOrgId: orgId,
        id: selectedSessionId as Id<"stocktakes">,
      })
      .then((next) => {
        if (isCancelled) return
        setSelectedSession((next as StocktakeDetails | null) ?? null)
        setIsUnavailable(false)
      })
      .catch((error) => {
        if (isCancelled) return
        if (isMissingPublicFunctionError(error)) {
          setSelectedSession(null)
          setIsUnavailable(true)
          return
        }
        console.error(error)
        setSelectedSession(null)
      })
      .finally(() => {
        if (isCancelled) return
        setIsFetching(false)
      })

    return () => {
      isCancelled = true
    }
  }, [convex, isUnavailable, orgId, selectedSessionId])

  const createMutation = useMutation(api.stocktakes.createSession)
  const startMutation = useMutation(api.stocktakes.startSession)
  const finalizeMutation = useMutation(api.stocktakes.finalizeSession)

  return {
    sessions,
    selectedSession,
    isLoading,
    isFetching,
    isUnavailable,
    hasOrg: Boolean(orgId),
    async createSession(name?: string) {
      if (!orgId) return null
      return createMutation({
        clerkOrgId: orgId,
        name: name?.trim() || undefined,
      })
    },
    async startSession(id: string) {
      if (!orgId) return
      await startMutation({
        clerkOrgId: orgId,
        id: id as Id<"stocktakes">,
      })
    },
    async finalizeSession(id: string, counts: StocktakeCountInput[]) {
      if (!orgId) return null
      return finalizeMutation({
        clerkOrgId: orgId,
        id: id as Id<"stocktakes">,
        counts: counts.map((item) => ({
          productId: item.productId as Id<"products">,
          countedQuantity: item.countedQuantity,
          note: item.note?.trim() || undefined,
        })),
      })
    },
  }
}
