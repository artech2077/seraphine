import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useSalesHistory } from "@/features/ventes/api"
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

describe("useSalesHistory", () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReset()
    vi.mocked(useQuery).mockReset()
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useOrganization).mockReturnValue(mockOrganization({ name: "Pharma" }))
  })

  it("maps sales records into history items", async () => {
    const ensurePharmacy = createMockMutation()
    const createMutation = createMockMutation()
    const removeMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createMutation)
      .mockImplementationOnce(() => removeMutation)

    const saleDate = new Date("2026-01-02T00:00:00Z").valueOf()

    vi.mocked(useQuery).mockReturnValue([
      {
        _id: "sale-1",
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
    ])

    const { result } = renderHook(() => useSalesHistory())

    await waitFor(() => {
      expect(ensurePharmacy).toHaveBeenCalledWith({ clerkOrgId: "org-1", name: "Pharma" })
    })

    expect(result.current.items[0]).toEqual(
      expect.objectContaining({
        id: "sale-1",
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
    const ensurePharmacy = createMockMutation()
    const createMutation = createMockMutation()
    const removeMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createMutation)
      .mockImplementationOnce(() => removeMutation)

    vi.mocked(useQuery).mockReturnValue([])

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
    const ensurePharmacy = createMockMutation()
    const createMutation = createMockMutation()
    const removeMutation = createMockMutation()

    vi.mocked(useMutation)
      .mockImplementationOnce(() => ensurePharmacy)
      .mockImplementationOnce(() => createMutation)
      .mockImplementationOnce(() => removeMutation)

    vi.mocked(useQuery).mockReturnValue([])

    const { result } = renderHook(() => useSalesHistory())

    await result.current.removeSale({
      id: "sale-1",
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
})
