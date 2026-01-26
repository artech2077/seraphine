import { renderHook } from "@testing-library/react"
import { vi } from "vitest"

import { useSalesHistory } from "@/features/ventes/api"
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

describe("useSalesHistory", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useConvex).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useConvex).mockReturnValue({ query: vi.fn() })
  })

  it("maps sales records into history items", async () => {
    const createMutation = createMockMutation()
    const updateMutation = createMockMutation()
    const removeMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createMutation)
      .mockImplementationOnce(() => updateMutation)
      .mockImplementationOnce(() => removeMutation)

    const saleDate = new Date("2026-01-02T00:00:00Z").valueOf()

    const records = [
      {
        _id: "sale-1",
        saleNumber: "FAC-01",
        saleSequence: 1,
        saleDate,
        paymentMethod: "CASH",
        totalAmountTtc: 120,
        globalDiscountType: "PERCENT",
        globalDiscountValue: 10,
        clientName: "Client A",
        sellerName: "Nora",
        items: [
          {
            _id: "item-1",
            productId: "prod-1",
            productNameSnapshot: "Produit A",
            quantity: 2,
            unitPriceHt: 50,
            vatRate: 20,
            lineDiscountType: "PERCENT",
            lineDiscountValue: 10,
            totalLineTtc: 108,
          },
        ],
      },
    ]

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : records))

    const { result } = renderHook(() => useSalesHistory())

    expect(result.current.items[0]).toEqual(
      expect.objectContaining({
        id: "sale-1",
        saleNumber: "FAC-01",
        client: "Client A",
        seller: "Nora",
        paymentMethod: "Espèce",
        globalDiscount: "10%",
        amountTtc: 120,
      })
    )

    expect(result.current.items[0].items[0]).toEqual(
      expect.objectContaining({
        product: "Produit A",
        discount: "10%",
      })
    )
  })

  it("creates a sale with computed totals", async () => {
    const createMutation = createMockMutation()
    const updateMutation = createMockMutation()
    const removeMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createMutation)
      .mockImplementationOnce(() => updateMutation)
      .mockImplementationOnce(() => removeMutation)

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : []))

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(123)

    const { result } = renderHook(() => useSalesHistory())

    await result.current.createSale({
      clientId: "client-1",
      paymentMethod: "card",
      globalDiscountType: "percent",
      globalDiscountValue: 10,
      lines: [
        {
          productId: "prod-1",
          productName: "Produit A",
          quantity: 2,
          unitPriceHt: 100,
          vatRate: 10,
          discountType: "percent",
          discountValue: 10,
        },
        {
          productId: "prod-2",
          productName: "Produit B",
          quantity: 1,
          unitPriceHt: 50,
          vatRate: 20,
          discountType: "amount",
          discountValue: 5,
        },
      ],
    })

    expect(createMutation).toHaveBeenCalled()
    const args = createMutation.mock.calls[0][0]

    expect(args).toEqual(
      expect.objectContaining({
        clerkOrgId: "org-1",
        saleDate: 123,
        clientId: "client-1",
        paymentMethod: "CARD",
        globalDiscountType: "PERCENT",
        globalDiscountValue: 10,
        totalAmountHt: 250,
      })
    )

    expect(args.totalAmountTtc).toBeCloseTo(227.7, 2)
    expect(args.items[0]).toEqual(
      expect.objectContaining({
        productId: "prod-1",
        productNameSnapshot: "Produit A",
        lineDiscountType: "PERCENT",
        lineDiscountValue: 10,
      })
    )
    expect(args.items[0].totalLineTtc).toBeCloseTo(198, 3)

    expect(args.items[1]).toEqual(
      expect.objectContaining({
        productId: "prod-2",
        productNameSnapshot: "Produit B",
        lineDiscountType: "AMOUNT",
        lineDiscountValue: 5,
      })
    )
    expect(args.items[1].totalLineTtc).toBeCloseTo(55, 3)

    nowSpy.mockRestore()
  })

  it("removes a sale", async () => {
    const createMutation = createMockMutation()
    const updateMutation = createMockMutation()
    const removeMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createMutation)
      .mockImplementationOnce(() => updateMutation)
      .mockImplementationOnce(() => removeMutation)

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : []))

    const { result } = renderHook(() => useSalesHistory())

    await result.current.removeSale({
      id: "sale-1",
      saleNumber: "FAC-01",
      date: "02 janv. 2026",
      client: "Client A",
      seller: "Nora",
      paymentMethod: "Espèce",
      globalDiscount: "-",
      amountTtc: 120,
      items: [],
    })

    expect(removeMutation).toHaveBeenCalledWith({
      clerkOrgId: "org-1",
      id: "sale-1",
    })
  })

  it("returns paginated sales metadata", async () => {
    const createMutation = createMockMutation()
    const updateMutation = createMockMutation()
    const removeMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createMutation)
      .mockImplementationOnce(() => updateMutation)
      .mockImplementationOnce(() => removeMutation)

    vi.mocked(useQuery).mockImplementation((_, args) => {
      if (args === "skip") return undefined
      return {
        items: [
          {
            _id: "sale-2",
            saleNumber: "FAC-02",
            saleSequence: 2,
            saleDate: 1700000000000,
            paymentMethod: "CARD",
            totalAmountTtc: 200,
            items: [],
          },
        ],
        totalCount: 4,
        filterOptions: { clients: ["Client B"], sellers: ["Nora"], products: ["Produit A"] },
        fallbackNumbers: {},
      }
    })

    const { result } = renderHook(() => useSalesHistory({ mode: "paged", page: 1, pageSize: 10 }))

    expect(result.current.totalCount).toBe(4)
    expect(result.current.filterOptions.clients).toEqual(["Client B"])
    expect(result.current.items[0].saleNumber).toBe("FAC-02")
  })

  it("updates a sale with computed totals", async () => {
    const createMutation = createMockMutation()
    const updateMutation = createMockMutation()
    const removeMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => createMutation)
      .mockImplementationOnce(() => updateMutation)
      .mockImplementationOnce(() => removeMutation)

    vi.mocked(useQuery).mockImplementation((_, args) => (args === "skip" ? undefined : []))

    const { result } = renderHook(() => useSalesHistory())

    await result.current.updateSale({
      id: "sale-1",
      clientId: "client-1",
      paymentMethod: "cash",
      globalDiscountType: "amount",
      globalDiscountValue: 5,
      lines: [
        {
          productId: "prod-1",
          productName: "Produit A",
          quantity: 1,
          unitPriceHt: 100,
          vatRate: 10,
          discountType: "amount",
          discountValue: 5,
        },
      ],
    })

    expect(updateMutation).toHaveBeenCalled()
    const args = updateMutation.mock.calls[0][0]

    expect(args).toEqual(
      expect.objectContaining({
        clerkOrgId: "org-1",
        id: "sale-1",
        paymentMethod: "CASH",
        globalDiscountType: "AMOUNT",
        globalDiscountValue: 5,
        totalAmountHt: 100,
      })
    )
    expect(args.totalAmountTtc).toBeCloseTo(100, 2)
  })
})
