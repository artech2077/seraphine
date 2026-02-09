import { renderHook } from "@testing-library/react"
import { vi } from "vitest"

import { useInventoryItems } from "@/features/inventaire/api"
import { mockClerkAuth } from "@/tests/mocks/clerk"
import { createMockMutation } from "@/tests/mocks/convex"

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
  useConvex: vi.fn(),
}))

const { useAuth } = await import("@clerk/nextjs")
const { useMutation, useQuery, useConvex } = await import("convex/react")

describe("useInventoryItems", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useConvex).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useConvex).mockReturnValue({ query: vi.fn() })
  })

  it("maps products into inventory items", async () => {
    const createProduct = createMockMutation()
    const updateProduct = createMockMutation()
    const removeProduct = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createProduct)
      .mockImplementationOnce(() => updateProduct)
      .mockImplementationOnce(() => removeProduct)

    const records = [
      {
        _id: "prod-1",
        name: "Doliprane",
        barcode: "123",
        category: "Medicaments",
        purchasePrice: 10,
        sellingPrice: 12,
        vatRate: 7,
        stockQuantity: 4,
        lowStockThreshold: 1,
        dosageForm: "Comprime",
      },
    ]

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : records))

    const { result } = renderHook(() => useInventoryItems())

    expect(result.current.items).toEqual([
      {
        id: "prod-1",
        name: "Doliprane",
        barcode: "123",
        stock: 4,
        threshold: 1,
        purchasePrice: 10,
        sellingPrice: 12,
        vatRate: 7,
        category: "Medicaments",
        dosageForm: "Comprime",
      },
    ])
  })

  it("passes mapped values to create mutation", async () => {
    const createProduct = createMockMutation()
    const updateProduct = createMockMutation()
    const removeProduct = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createProduct)
      .mockImplementationOnce(() => updateProduct)
      .mockImplementationOnce(() => removeProduct)

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : []))

    const { result } = renderHook(() => useInventoryItems())

    await result.current.createProduct({
      name: "Test",
      barcode: "",
      category: "Medicaments",
      dosageForm: "Comprime",
      purchasePrice: 1,
      sellingPrice: 2,
      vatRate: 7,
      stock: 3,
      threshold: 1,
      notes: "",
    })

    expect(createProduct).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      name: "Test",
      barcode: undefined,
      category: "Medicaments",
      purchasePrice: 1,
      sellingPrice: 2,
      vatRate: 7,
      stockQuantity: 3,
      lowStockThreshold: 1,
      dosageForm: "Comprime",
      internalNotes: undefined,
    })
  })

  it("creates multiple products in batch", async () => {
    const createProduct = createMockMutation()
    const updateProduct = createMockMutation()
    const removeProduct = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createProduct)
      .mockImplementationOnce(() => updateProduct)
      .mockImplementationOnce(() => removeProduct)

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : []))

    const { result } = renderHook(() => useInventoryItems())

    await result.current.createProductsBatch([
      {
        name: "Produit A",
        barcode: "111",
        category: "Medicaments",
        dosageForm: "Comprime",
        purchasePrice: 1,
        sellingPrice: 2,
        vatRate: 7,
        stock: 3,
        threshold: 1,
        notes: "",
      },
      {
        name: "Produit B",
        barcode: "",
        category: "Parapharmacie",
        dosageForm: "Sachet",
        purchasePrice: 5,
        sellingPrice: 8,
        vatRate: 20,
        stock: 6,
        threshold: 2,
        notes: "",
      },
    ])

    expect(createProduct).toHaveBeenCalledTimes(2)
    expect(createProduct).toHaveBeenNthCalledWith(1, {
      clerkOrgId: "org-1",
      name: "Produit A",
      barcode: "111",
      category: "Medicaments",
      purchasePrice: 1,
      sellingPrice: 2,
      vatRate: 7,
      stockQuantity: 3,
      lowStockThreshold: 1,
      dosageForm: "Comprime",
      internalNotes: undefined,
    })
    expect(createProduct).toHaveBeenNthCalledWith(2, {
      clerkOrgId: "org-1",
      name: "Produit B",
      barcode: undefined,
      category: "Parapharmacie",
      purchasePrice: 5,
      sellingPrice: 8,
      vatRate: 20,
      stockQuantity: 6,
      lowStockThreshold: 2,
      dosageForm: "Sachet",
      internalNotes: undefined,
    })
  })

  it("returns paginated inventory metadata", async () => {
    const createProduct = createMockMutation()
    const updateProduct = createMockMutation()
    const removeProduct = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createProduct)
      .mockImplementationOnce(() => updateProduct)
      .mockImplementationOnce(() => removeProduct)

    vi.mocked(useQuery).mockImplementation((_, args) => {
      if (args === "skip") return undefined
      return {
        items: [
          {
            _id: "prod-2",
            name: "Test",
            barcode: "",
            category: "Dermato",
            purchasePrice: 5,
            sellingPrice: 7,
            vatRate: 20,
            stockQuantity: 2,
            lowStockThreshold: 1,
            dosageForm: "Gel",
          },
        ],
        totalCount: 9,
        filterOptions: {
          names: ["Test"],
          barcodes: ["Sans code barre"],
          suppliers: [],
          categories: ["Dermato"],
        },
      }
    })

    const { result } = renderHook(() => useInventoryItems({ mode: "paged", page: 1, pageSize: 10 }))

    expect(result.current.totalCount).toBe(9)
    expect(result.current.filterOptions.categories).toEqual(["Dermato"])
    expect(result.current.items[0].name).toBe("Test")
  })
})
