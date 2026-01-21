import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useInventoryItems } from "@/features/inventaire/api"
import { mockClerkAuth, mockOrganization } from "@/tests/mocks/clerk"
import { createMockMutation } from "@/tests/mocks/convex"

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
  useOrganization: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}))

const { useAuth, useOrganization } = await import("@clerk/nextjs")
const { useMutation, useQuery } = await import("convex/react")

describe("useInventoryItems", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useOrganization).mockReturnValue(mockOrganization({ name: "Test Org" }))
  })

  it("maps products into inventory items", async () => {
    const ensurePharmacy = createMockMutation()
    const createProduct = createMockMutation()
    const updateProduct = createMockMutation()
    const removeProduct = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createProduct)
      .mockImplementationOnce(() => updateProduct)
      .mockImplementationOnce(() => removeProduct)

    vi.mocked(useQuery).mockReturnValue([
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
    ])

    const { result } = renderHook(() => useInventoryItems())

    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledWith({
        clerkOrgId: "org-1",
        name: "Test Org",
      })
    })

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
    const ensurePharmacy = createMockMutation()
    const createProduct = createMockMutation()
    const updateProduct = createMockMutation()
    const removeProduct = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createProduct)
      .mockImplementationOnce(() => updateProduct)
      .mockImplementationOnce(() => removeProduct)

    vi.mocked(useQuery).mockReturnValue([])

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
})
