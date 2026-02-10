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
