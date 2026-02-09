import { renderHook } from "@testing-library/react"
import { vi } from "vitest"

import { useDeliveryNotes, usePurchaseOrders } from "@/features/achats/api"
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

describe("usePurchaseOrders", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useConvex).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useConvex).mockReturnValue({ query: vi.fn() })
  })

  it("maps procurement orders to purchase orders", async () => {
    const createOrder = createMockMutation()
    const updateOrder = createMockMutation()
    const removeOrder = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createOrder)
      .mockImplementationOnce(() => updateOrder)
      .mockImplementationOnce(() => removeOrder)

    const createdAt = new Date("2026-01-01T00:00:00Z").valueOf()

    const orders = [
      {
        id: "order-1",
        orderNumber: "BC-01",
        orderSequence: 1,
        supplierName: "Pharma Nord",
        channel: "EMAIL",
        createdAt,
        orderDate: createdAt,
        dueDate: createdAt,
        totalAmount: 150,
        status: "ORDERED",
        type: "PURCHASE_ORDER",
        externalReference: null,
        globalDiscountType: "PERCENT",
        globalDiscountValue: 5,
        items: [
          {
            id: "item-1",
            productId: "prod-1",
            productName: "Produit A",
            quantity: 2,
            unitPrice: 50,
            lineDiscountType: "AMOUNT",
            lineDiscountValue: 10,
          },
        ],
      },
    ]

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : orders))

    const { result } = renderHook(() => usePurchaseOrders())

    expect(result.current.orders[0]).toEqual(
      expect.objectContaining({
        id: "order-1",
        orderNumber: "BC-01",
        supplier: "Pharma Nord",
        channel: "Email",
        status: "Commandé",
        total: 150,
        dueDate: "2026-01-01",
        globalDiscountType: "percent",
        globalDiscountValue: 5,
      })
    )
    expect(result.current.orders[0]?.items[0]).toEqual(
      expect.objectContaining({
        productId: "prod-1",
        lineDiscountType: "amount",
        lineDiscountValue: 10,
      })
    )
  })

  it("creates purchase orders without remise fields", async () => {
    const createOrder = createMockMutation()
    const updateOrder = createMockMutation()
    const removeOrder = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createOrder)
      .mockImplementationOnce(() => updateOrder)
      .mockImplementationOnce(() => removeOrder)

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : []))

    const { result } = renderHook(() => usePurchaseOrders())

    await result.current.createOrder({
      supplierId: "supplier-1",
      channel: "Email",
      status: "Commandé",
      orderDate: "2026-01-02",
      dueDate: "2026-01-10",
      globalDiscountType: "percent",
      globalDiscountValue: 10,
      items: [
        {
          productId: "prod-1",
          quantity: 2,
          unitPrice: 50,
          lineDiscountType: "amount",
          lineDiscountValue: 10,
        },
        {
          productId: "prod-2",
          quantity: 1,
          unitPrice: 30,
          lineDiscountType: "percent",
          lineDiscountValue: 5,
        },
      ],
    })

    expect(createOrder).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      type: "PURCHASE_ORDER",
      supplierId: "supplier-1",
      status: "ORDERED",
      channel: "EMAIL",
      orderDate: Date.parse("2026-01-02"),
      dueDate: undefined,
      globalDiscountType: undefined,
      globalDiscountValue: 0,
      totalAmount: 130,
      items: [
        {
          productId: "prod-1",
          quantity: 2,
          unitPrice: 50,
          lineDiscountType: undefined,
          lineDiscountValue: 0,
        },
        {
          productId: "prod-2",
          quantity: 1,
          unitPrice: 30,
          lineDiscountType: undefined,
          lineDiscountValue: 0,
        },
      ],
    })
  })

  it("returns paginated purchase orders metadata", async () => {
    const createOrder = createMockMutation()
    const updateOrder = createMockMutation()
    const removeOrder = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createOrder)
      .mockImplementationOnce(() => updateOrder)
      .mockImplementationOnce(() => removeOrder)

    vi.mocked(useQuery).mockImplementation((_, args) => {
      if (args === "skip") return undefined
      return {
        items: [
          {
            id: "order-2",
            orderNumber: "BC-02",
            orderSequence: 2,
            supplierName: "Pharma Nord",
            channel: "EMAIL",
            createdAt: 1700000000000,
            orderDate: 1700000000000,
            totalAmount: 80,
            status: "DRAFT",
            type: "PURCHASE_ORDER",
            externalReference: null,
            items: [],
          },
        ],
        totalCount: 6,
        filterOptions: { suppliers: ["Pharma Nord"], references: [] },
        fallbackNumbers: {},
      }
    })

    const { result } = renderHook(() => usePurchaseOrders({ mode: "paged", page: 1, pageSize: 10 }))

    expect(result.current.totalCount).toBe(6)
    expect(result.current.filterOptions.suppliers).toEqual(["Pharma Nord"])
    expect(result.current.orders[0].orderNumber).toBe("BC-02")
  })
})

describe("useDeliveryNotes", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
  })

  it("maps procurement orders to delivery notes", async () => {
    const createNote = createMockMutation()
    const createFromPurchase = createMockMutation()
    const updateNote = createMockMutation()
    const removeNote = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createNote)
      .mockImplementationOnce(() => createFromPurchase)
      .mockImplementationOnce(() => updateNote)
      .mockImplementationOnce(() => removeNote)

    const notes = [
      {
        id: "note-1",
        orderNumber: "BL-01",
        orderSequence: 1,
        supplierName: "Pharma Sud",
        channel: "PHONE",
        createdAt: 1700000000000,
        orderDate: 1700000000000,
        dueDate: 1700000000000,
        totalAmount: 99,
        status: "ORDERED",
        type: "DELIVERY_NOTE",
        externalReference: null,
        globalDiscountType: "AMOUNT",
        globalDiscountValue: 12,
        items: [],
      },
    ]

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : notes))

    const { result } = renderHook(() => useDeliveryNotes())

    expect(result.current.notes[0]).toEqual(
      expect.objectContaining({
        id: "note-1",
        orderNumber: "BL-01",
        supplier: "Pharma Sud",
        channel: "Téléphone",
        status: "Commandé",
        externalReference: "-",
        dueDate: "2023-11-14",
        globalDiscountType: "amount",
        globalDiscountValue: 12,
      })
    )
  })

  it("creates delivery notes with external references", async () => {
    const createNote = createMockMutation()
    const createFromPurchase = createMockMutation()
    const updateNote = createMockMutation()
    const removeNote = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createNote)
      .mockImplementationOnce(() => createFromPurchase)
      .mockImplementationOnce(() => updateNote)
      .mockImplementationOnce(() => removeNote)

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : []))

    const { result } = renderHook(() => useDeliveryNotes())

    await result.current.createNote({
      supplierId: "supplier-2",
      channel: "Téléphone",
      status: "En cours",
      orderDate: "2026-02-01",
      dueDate: "2026-02-15",
      globalDiscountType: "amount",
      globalDiscountValue: 5,
      externalReference: "BL-42",
      items: [{ productId: "prod-3", quantity: 1, unitPrice: 20, lineDiscountValue: 0 }],
    })

    expect(createNote).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      type: "DELIVERY_NOTE",
      supplierId: "supplier-2",
      status: "IN_PROGRESS",
      channel: "PHONE",
      orderDate: Date.parse("2026-02-01"),
      dueDate: Date.parse("2026-02-15"),
      globalDiscountType: "AMOUNT",
      globalDiscountValue: 5,
      totalAmount: 15,
      externalReference: "BL-42",
      items: [
        {
          productId: "prod-3",
          quantity: 1,
          unitPrice: 20,
          lineDiscountType: "PERCENT",
          lineDiscountValue: 0,
        },
      ],
    })
  })

  it("creates a delivery note from a purchase order", async () => {
    const createNote = createMockMutation()
    const createFromPurchase = createMockMutation()
    const updateNote = createMockMutation()
    const removeNote = createMockMutation()
    createFromPurchase.mockResolvedValue("note-42")

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createNote)
      .mockImplementationOnce(() => createFromPurchase)
      .mockImplementationOnce(() => updateNote)
      .mockImplementationOnce(() => removeNote)

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : []))

    const { result } = renderHook(() => useDeliveryNotes())
    const createdId = await result.current.createFromPurchase({
      id: "order-1",
      orderNumber: "BC-01",
      supplierId: "supplier-1",
      supplier: "Pharma Nord",
      channel: "Email",
      createdAt: "2026-02-01",
      orderDate: "2026-02-01",
      total: 120,
      status: "Commandé",
      items: [],
    })

    expect(createFromPurchase).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      purchaseOrderId: "order-1",
    })
    expect(createdId).toBe("note-42")
  })

  it("returns paginated delivery notes metadata", async () => {
    const createNote = createMockMutation()
    const createFromPurchase = createMockMutation()
    const updateNote = createMockMutation()
    const removeNote = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createNote)
      .mockImplementationOnce(() => createFromPurchase)
      .mockImplementationOnce(() => updateNote)
      .mockImplementationOnce(() => removeNote)

    vi.mocked(useQuery).mockImplementation((_, args) => {
      if (args === "skip") return undefined
      return {
        items: [
          {
            id: "note-2",
            orderNumber: "BL-02",
            orderSequence: 2,
            supplierName: "Pharma Sud",
            channel: "PHONE",
            createdAt: 1700000000000,
            orderDate: 1700000000000,
            totalAmount: 120,
            status: "DELIVERED",
            type: "DELIVERY_NOTE",
            externalReference: "REF-1",
            items: [],
          },
        ],
        totalCount: 2,
        filterOptions: { suppliers: ["Pharma Sud"], references: ["REF-1"] },
        fallbackNumbers: {},
      }
    })

    const { result } = renderHook(() => useDeliveryNotes({ mode: "paged", page: 1, pageSize: 10 }))

    expect(result.current.totalCount).toBe(2)
    expect(result.current.filterOptions.references).toEqual(["REF-1"])
    expect(result.current.notes[0].orderNumber).toBe("BL-02")
  })
})
