import { renderHook } from "@testing-library/react"
import { vi } from "vitest"

import { useSuppliers } from "@/features/fournisseurs/api"
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

describe("useSuppliers", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useConvex).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useConvex).mockReturnValue({ query: vi.fn() })
  })

  it("maps supplier records into table items", async () => {
    const createSupplier = createMockMutation()
    const updateSupplier = createMockMutation()
    const removeSupplier = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createSupplier)
      .mockImplementationOnce(() => updateSupplier)
      .mockImplementationOnce(() => removeSupplier)

    const records = [
      {
        _id: "supplier-1",
        supplierNumber: "FOUR-01",
        supplierSequence: 1,
        name: "Fournisseur A",
        email: "contact@example.com",
        phone: "0600000000",
        city: "Rabat",
        balance: -120,
        internalNotes: "Note",
      },
    ]

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : records))

    const { result } = renderHook(() => useSuppliers())

    expect(result.current.items[0]).toEqual(
      expect.objectContaining({
        id: "supplier-1",
        supplierNumber: "FOUR-01",
        name: "Fournisseur A",
        email: "contact@example.com",
        phone: "0600000000",
        city: "Rabat",
        balance: -120,
        notes: "Note",
      })
    )
  })

  it("creates suppliers with mapped fields", async () => {
    const createSupplier = createMockMutation()
    const updateSupplier = createMockMutation()
    const removeSupplier = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createSupplier)
      .mockImplementationOnce(() => updateSupplier)
      .mockImplementationOnce(() => removeSupplier)

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : []))

    const { result } = renderHook(() => useSuppliers())

    await result.current.createSupplier({
      name: "Nouveau",
      email: "",
      phone: "",
      city: "",
      balance: 0,
      notes: "",
    })

    expect(createSupplier).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      name: "Nouveau",
      email: undefined,
      phone: undefined,
      city: undefined,
      balance: 0,
      internalNotes: undefined,
    })
  })

  it("returns paginated supplier metadata", async () => {
    const createSupplier = createMockMutation()
    const updateSupplier = createMockMutation()
    const removeSupplier = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createSupplier)
      .mockImplementationOnce(() => updateSupplier)
      .mockImplementationOnce(() => removeSupplier)

    vi.mocked(useQuery).mockImplementation((_, args) => {
      if (args === "skip") return undefined
      return {
        items: [
          {
            _id: "supplier-2",
            supplierNumber: "FOUR-02",
            supplierSequence: 2,
            name: "Fournisseur B",
            balance: 10,
          },
        ],
        totalCount: 3,
        filterOptions: { names: ["Fournisseur B"], cities: [""] },
        fallbackNumbers: {},
      }
    })

    const { result } = renderHook(() =>
      useSuppliers({ mode: "paged", page: 1, pageSize: 10, filters: { names: ["Fournisseur B"] } })
    )

    expect(result.current.totalCount).toBe(3)
    expect(result.current.filterOptions.names).toEqual(["Fournisseur B"])
    expect(result.current.items[0].name).toBe("Fournisseur B")
  })
})
