import {
  filterProductsByFilters,
  getProductStockStatus,
  type ProductSearchItem,
} from "@/features/products/product-search-utils"

const PRODUCTS: ProductSearchItem[] = [
  {
    id: "prod-1",
    name: "Paracétamol 1g",
    barcode: "1001",
    category: "Médicaments",
    sellingPrice: 18,
    stockQuantity: 20,
    lowStockThreshold: 5,
  },
  {
    id: "prod-2",
    name: "Vitamine C 500",
    barcode: "2002",
    category: "Parapharmacie",
    sellingPrice: 35,
    stockQuantity: 4,
    lowStockThreshold: 6,
  },
  {
    id: "prod-3",
    name: "Gel hydroalcoolique",
    barcode: "3003",
    category: "Parapharmacie",
    sellingPrice: 52,
    stockQuantity: 0,
    lowStockThreshold: 4,
  },
]

describe("product-search-utils", () => {
  it("derives stock status from stock quantities", () => {
    expect(getProductStockStatus(PRODUCTS[0])).toBe("En stock")
    expect(getProductStockStatus(PRODUCTS[1])).toBe("Stock bas")
    expect(getProductStockStatus(PRODUCTS[2])).toBe("Rupture")
  })

  it("filters with combined criteria", () => {
    const results = filterProductsByFilters(PRODUCTS, {
      nameQuery: "vitamine",
      barcodeQuery: "2002",
      category: "Parapharmacie",
      minPpv: "10",
      maxPpv: "40",
      stockFilter: "low-stock",
    })

    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe("prod-2")
  })

  it("ignores empty numeric filters", () => {
    const results = filterProductsByFilters(PRODUCTS, {
      nameQuery: "",
      barcodeQuery: "",
      category: "",
      minPpv: "",
      maxPpv: "",
      stockFilter: "all",
    })

    expect(results).toHaveLength(3)
  })
})
