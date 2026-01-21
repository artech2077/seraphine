import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useDeliveryNotes, usePurchaseOrders } from "@/features/achats/api"
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

describe("usePurchaseOrders", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useOrganization).mockReturnValue(mockOrganization({ name: "Pharmacie" }))
  })

  it("maps procurement orders to purchase orders", async () => {
    const ensurePharmacy = createMockMutation()
    const createOrder = createMockMutation()
    const updateOrder = createMockMutation()
    const removeOrder = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createOrder)
      .mockImplementationOnce(() => updateOrder)
      .mockImplementationOnce(() => removeOrder)

    const createdAt = new Date("2026-01-01T00:00:00Z").valueOf()

    vi.mocked(useQuery).mockReturnValue([
      {
        id: "order-1",
        supplierName: "Pharma Nord",
        channel: "EMAIL",
        createdAt,
        orderDate: createdAt,
        totalAmount: 150,
        status: "ORDERED",
        type: "PURCHASE_ORDER",
        externalReference: null,
        items: [
          {
            id: "item-1",
            productName: "Produit A",
            quantity: 2,
            unitPrice: 50,
          },
        ],
      },
    ])

    const { result } = renderHook(() => usePurchaseOrders())

    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledWith({ clerkOrgId: "org-1", name: "Pharmacie" })
    })

    expect(result.current.orders[0]).toEqual(
      expect.objectContaining({
        id: "order-1",
        supplier: "Pharma Nord",
        channel: "Email",
        status: "Commandé",
        total: 150,
      })
    )
  })

  it("creates purchase orders with mapped status and totals", async () => {
    const ensurePharmacy = createMockMutation()
    const createOrder = createMockMutation()
    const updateOrder = createMockMutation()
    const removeOrder = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createOrder)
      .mockImplementationOnce(() => updateOrder)
      .mockImplementationOnce(() => removeOrder)

    vi.mocked(useQuery).mockReturnValue([])

    const { result } = renderHook(() => usePurchaseOrders())

    await result.current.createOrder({
      supplierId: "supplier-1",
      channel: "Email",
      status: "Commandé",
      orderDate: "2026-01-02",
      items: [
        { productId: "prod-1", quantity: 2, unitPrice: 50 },
        { productId: "prod-2", quantity: 1, unitPrice: 30 },
      ],
    })

    expect(createOrder).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      type: "PURCHASE_ORDER",
      supplierId: "supplier-1",
      status: "ORDERED",
      channel: "EMAIL",
      orderDate: Date.parse("2026-01-02"),
      totalAmount: 130,
      items: [
        { productId: "prod-1", quantity: 2, unitPrice: 50 },
        { productId: "prod-2", quantity: 1, unitPrice: 30 },
      ],
    })
  })
})

describe("useDeliveryNotes", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useOrganization).mockReturnValue(mockOrganization({ name: "Pharmacie" }))
  })

  it("maps procurement orders to delivery notes", async () => {
    const ensurePharmacy = createMockMutation()
    const createNote = createMockMutation()
    const updateNote = createMockMutation()
    const removeNote = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createNote)
      .mockImplementationOnce(() => updateNote)
      .mockImplementationOnce(() => removeNote)

    vi.mocked(useQuery).mockReturnValue([
      {
        id: "note-1",
        supplierName: "Pharma Sud",
        channel: "PHONE",
        createdAt: 1700000000000,
        orderDate: 1700000000000,
        totalAmount: 99,
        status: "ORDERED",
        type: "DELIVERY_NOTE",
        externalReference: null,
        items: [],
      },
    ])

    const { result } = renderHook(() => useDeliveryNotes())

    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledWith({ clerkOrgId: "org-1", name: "Pharmacie" })
    })

    expect(result.current.notes[0]).toEqual(
      expect.objectContaining({
        id: "note-1",
        supplier: "Pharma Sud",
        channel: "Téléphone",
        status: "En cours",
        externalReference: "-",
      })
    )
  })

  it("creates delivery notes with external references", async () => {
    const ensurePharmacy = createMockMutation()
    const createNote = createMockMutation()
    const updateNote = createMockMutation()
    const removeNote = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createNote)
      .mockImplementationOnce(() => updateNote)
      .mockImplementationOnce(() => removeNote)

    vi.mocked(useQuery).mockReturnValue([])

    const { result } = renderHook(() => useDeliveryNotes())

    await result.current.createNote({
      supplierId: "supplier-2",
      channel: "Téléphone",
      status: "En cours",
      orderDate: "2026-02-01",
      externalReference: "BL-42",
      items: [{ productId: "prod-3", quantity: 1, unitPrice: 20 }],
    })

    expect(createNote).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      type: "DELIVERY_NOTE",
      supplierId: "supplier-2",
      status: "ORDERED",
      channel: "PHONE",
      orderDate: Date.parse("2026-02-01"),
      totalAmount: 20,
      externalReference: "BL-42",
      items: [{ productId: "prod-3", quantity: 1, unitPrice: 20 }],
    })
  })
})
