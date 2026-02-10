export type ProductSearchStockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock"

export type ProductSearchItem = {
  id: string
  name: string
  barcode: string
  category: string
  sellingPrice: number
  stockQuantity: number
  lowStockThreshold: number
}

export type ProductSearchFilters = {
  nameQuery: string
  barcodeQuery: string
  category: string
  minPpv: string
  maxPpv: string
  stockFilter: ProductSearchStockFilter
}

export type ProductStockStatus = "En stock" | "Stock bas" | "Rupture"

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("fr")
}

function parsePriceFilter(value: string) {
  if (!value.trim()) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function getProductStockStatus(product: ProductSearchItem): ProductStockStatus {
  if (product.stockQuantity <= 0) {
    return "Rupture"
  }
  if (product.stockQuantity <= product.lowStockThreshold) {
    return "Stock bas"
  }
  return "En stock"
}

export function filterProductsByFilters<TProduct extends ProductSearchItem>(
  products: TProduct[],
  filters: ProductSearchFilters
) {
  const normalizedName = normalizeText(filters.nameQuery)
  const normalizedBarcode = normalizeText(filters.barcodeQuery)
  const normalizedCategory = normalizeText(filters.category)
  const minPpv = parsePriceFilter(filters.minPpv)
  const maxPpv = parsePriceFilter(filters.maxPpv)

  return products.filter((product) => {
    const name = normalizeText(product.name)
    const barcode = normalizeText(product.barcode)
    const category = normalizeText(product.category)
    const stockStatus = getProductStockStatus(product)

    if (normalizedName && !name.includes(normalizedName)) {
      return false
    }

    if (normalizedBarcode && !barcode.includes(normalizedBarcode)) {
      return false
    }

    if (normalizedCategory && category !== normalizedCategory) {
      return false
    }

    if (minPpv !== null && product.sellingPrice < minPpv) {
      return false
    }

    if (maxPpv !== null && product.sellingPrice > maxPpv) {
      return false
    }

    if (filters.stockFilter === "in-stock" && stockStatus !== "En stock") {
      return false
    }

    if (filters.stockFilter === "low-stock" && stockStatus !== "Stock bas") {
      return false
    }

    if (filters.stockFilter === "out-of-stock" && stockStatus !== "Rupture") {
      return false
    }

    return true
  })
}
