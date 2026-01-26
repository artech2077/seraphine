import { renderHook } from "@testing-library/react"
import { vi } from "vitest"

import { useClients } from "@/features/clients/api"
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

describe("useClients", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useConvex).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useConvex).mockReturnValue({ query: vi.fn() })
  })

  it("maps client records into table items", async () => {
    const createClient = createMockMutation()
    const updateClient = createMockMutation()
    const removeClient = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createClient)
      .mockImplementationOnce(() => updateClient)
      .mockImplementationOnce(() => removeClient)

    const records = [
      {
        _id: "client-1",
        clientNumber: "CLI-01",
        clientSequence: 1,
        name: "Client A",
        phone: "0600000000",
        city: "Rabat",
        creditLimit: 200,
        outstandingBalance: 50,
        accountStatus: "SURVEILLE",
        lastPurchaseDate: 1700000000000,
        internalNotes: "Note",
      },
    ]

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : records))

    const { result } = renderHook(() => useClients())

    expect(result.current.items[0]).toEqual(
      expect.objectContaining({
        id: "client-1",
        clientNumber: "CLI-01",
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
    const createClient = createMockMutation()
    const updateClient = createMockMutation()
    const removeClient = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createClient)
      .mockImplementationOnce(() => updateClient)
      .mockImplementationOnce(() => removeClient)

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : []))

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

  it("returns paginated list metadata", async () => {
    const createClient = createMockMutation()
    const updateClient = createMockMutation()
    const removeClient = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createClient)
      .mockImplementationOnce(() => updateClient)
      .mockImplementationOnce(() => removeClient)

    vi.mocked(useQuery).mockImplementation((_, args) => {
      if (args === "skip") return undefined
      return {
        items: [
          {
            _id: "client-2",
            clientNumber: "CLI-02",
            clientSequence: 2,
            name: "Client B",
            phone: "",
            city: "Casablanca",
            creditLimit: 100,
            outstandingBalance: 20,
            accountStatus: "OK",
          },
        ],
        totalCount: 12,
        filterOptions: { names: ["Client B"], cities: ["Casablanca"] },
        fallbackNumbers: {},
      }
    })

    const { result } = renderHook(() =>
      useClients({ mode: "paged", page: 1, pageSize: 10, filters: { names: ["Client B"] } })
    )

    expect(result.current.totalCount).toBe(12)
    expect(result.current.filterOptions.names).toEqual(["Client B"])
    expect(result.current.items[0].name).toBe("Client B")
  })
})
