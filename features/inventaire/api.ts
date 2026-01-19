"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { InventoryItem } from "@/features/inventaire/inventory-table"

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
}

export type ProductCatalogItem = {
  id: string
  name: string
  sellingPrice: number
  vatRate: number
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
  }
}

function mapProductToCatalogItem(product: InventoryProduct): ProductCatalogItem {
  return {
    id: product._id,
    name: product.name,
    sellingPrice: product.sellingPrice,
    vatRate: product.vatRate,
  }
}

function useProducts() {
  const { isLoaded, orgId, userId } = useAuth()
  const { organization } = useOrganization()
  const ensurePharmacy = useMutation(api.pharmacies.ensureForOrg)
  const orgName = organization?.name ?? "Pharmacie"

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])

  const products = useQuery(api.products.listByOrg, orgId ? { clerkOrgId: orgId } : "skip") as
    | InventoryProduct[]
    | undefined

  return {
    products,
    isLoading: products === undefined,
  }
}

export function useInventoryItems() {
  const { orgId } = useAuth()
  const { products, isLoading } = useProducts()
  const createProductMutation = useMutation(api.products.create)
  const updateProductMutation = useMutation(api.products.update)
  const removeProductMutation = useMutation(api.products.remove)

  const items = React.useMemo(() => {
    if (!products) return []
    return products.map(mapProductToInventoryItem)
  }, [products])

  return {
    items,
    isLoading,
    hasOrg: Boolean(orgId),
    async createProduct(values: InventoryFormValues) {
      if (!orgId) return
      await createProductMutation({
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
      })
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
