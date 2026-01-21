import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useSuppliers } from "@/features/fournisseurs/api"
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

describe("useSuppliers", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useOrganization).mockReturnValue(mockOrganization({ name: "Pharmacie" }))
  })

  it("maps supplier records into table items", async () => {
    const ensurePharmacy = createMockMutation()
    const createSupplier = createMockMutation()
    const updateSupplier = createMockMutation()
    const removeSupplier = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createSupplier)
      .mockImplementationOnce(() => updateSupplier)
      .mockImplementationOnce(() => removeSupplier)

    vi.mocked(useQuery).mockReturnValue([
      {
        _id: "supplier-1",
        name: "Fournisseur A",
        email: "contact@example.com",
        phone: "0600000000",
        city: "Rabat",
        balance: -120,
        internalNotes: "Note",
      },
    ])

    const { result } = renderHook(() => useSuppliers())

    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledWith({ clerkOrgId: "org-1", name: "Pharmacie" })
    })

    expect(result.current.items[0]).toEqual(
      expect.objectContaining({
        id: "supplier-1",
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
    const ensurePharmacy = createMockMutation()
    const createSupplier = createMockMutation()
    const updateSupplier = createMockMutation()
    const removeSupplier = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createSupplier)
      .mockImplementationOnce(() => updateSupplier)
      .mockImplementationOnce(() => removeSupplier)

    vi.mocked(useQuery).mockReturnValue([])

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
})
