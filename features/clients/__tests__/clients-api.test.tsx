import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useClients } from "@/features/clients/api"
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

describe("useClients", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useOrganization).mockReturnValue(mockOrganization({ name: "Pharmacie" }))
  })

  it("maps client records into table items", async () => {
    const ensurePharmacy = createMockMutation()
    const createClient = createMockMutation()
    const updateClient = createMockMutation()
    const removeClient = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createClient)
      .mockImplementationOnce(() => updateClient)
      .mockImplementationOnce(() => removeClient)

    vi.mocked(useQuery).mockReturnValue([
      {
        _id: "client-1",
        name: "Client A",
        phone: "0600000000",
        city: "Rabat",
        creditLimit: 200,
        outstandingBalance: 50,
        accountStatus: "SURVEILLE",
        lastPurchaseDate: 1700000000000,
        internalNotes: "Note",
      },
    ])

    const { result } = renderHook(() => useClients())

    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledWith({ clerkOrgId: "org-1", name: "Pharmacie" })
    })

    expect(result.current.items[0]).toEqual(
      expect.objectContaining({
        id: "client-1",
        name: "Client A",
        phone: "0600000000",
        city: "Rabat",
        plafond: 200,
        encours: 50,
        status: "Surveillé",
        lastPurchase: "2023-11-14",
        notes: "Note",
      })
    )
  })

  it("creates clients with mapped fields", async () => {
    const ensurePharmacy = createMockMutation()
    const createClient = createMockMutation()
    const updateClient = createMockMutation()
    const removeClient = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createClient)
      .mockImplementationOnce(() => updateClient)
      .mockImplementationOnce(() => removeClient)

    vi.mocked(useQuery).mockReturnValue([])

    const { result } = renderHook(() => useClients())

    await result.current.createClient({
      name: "Client B",
      phone: "",
      city: "",
      plafond: 0,
      encours: 0,
      status: "OK",
      notes: "",
    })

    expect(createClient).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      name: "Client B",
      phone: undefined,
      city: undefined,
      creditLimit: 0,
      outstandingBalance: 0,
      accountStatus: "OK",
      internalNotes: undefined,
    })
  })
})
