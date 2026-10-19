import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useExpiryRiskAlerts } from "@/features/inventaire/api"
import { mockClerkAuth } from "@/tests/mocks/clerk"

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useConvex: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}))

const { useAuth } = await import("@clerk/nextjs")
const { useConvex } = await import("convex/react")

describe("useExpiryRiskAlerts", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useConvex).mockReset()
  })

  it("maps expiry risk payload and exposes filter options", async () => {
    const query = vi.fn().mockResolvedValue({
      items: [
        {
          lotId: "lot-1",
          productId: "product-1",
          productName: "Doliprane",
          productCategory: "Medicaments",
          lotNumber: "LOT-001",
          expiryDate: Date.parse("2026-03-01"),
          daysToExpiry: 18,
          quantity: 4,
          supplierId: "supplier-1",
          supplierName: "Pharma Distribution",
          severity: "CRITICAL",
          recommendedAction: "Prioriser la vente FEFO ou initier un retour fournisseur.",
          recommendedPathLabel: "Prioriser la vente",
          recommendedPathHref: "/app/ventes",
          lotDetailPath: "/app/produit?productId=product-1&lotNumber=LOT-001",
        },
      ],
      counts: {
        total: 1,
        expired: 0,
        dueIn30Days: 1,
        dueIn60Days: 1,
        dueIn90Days: 1,
      },
      filterOptions: {
        products: [{ id: "product-1", name: "Doliprane" }],
        categories: ["Medicaments"],
        suppliers: [{ id: "supplier-1", name: "Pharma Distribution" }],
        severities: ["EXPIRED", "CRITICAL", "WARNING", "WATCH"],
      },
    })
    vi.mocked(useConvex).mockReturnValue({ query })

    const { result } = renderHook(() => useExpiryRiskAlerts())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.items).toEqual([
      expect.objectContaining({
        lotId: "lot-1",
        productId: "product-1",
        lotNumber: "LOT-001",
        supplierName: "Pharma Distribution",
        severity: "CRITICAL",
      }),
    ])
    expect(result.current.counts.total).toBe(1)
    expect(result.current.filterOptions.products).toEqual([{ id: "product-1", name: "Doliprane" }])
    expect(result.current.filterOptions.suppliers).toEqual([
      { id: "supplier-1", name: "Pharma Distribution" },
    ])
  })

  it("forwards selected window and filters to query args", async () => {
    const query = vi.fn().mockResolvedValue({
      items: [],
      counts: {
        total: 0,
        expired: 0,
        dueIn30Days: 0,
        dueIn60Days: 0,
        dueIn90Days: 0,
      },
      filterOptions: {
        products: [],
        categories: [],
        suppliers: [],
        severities: ["EXPIRED", "CRITICAL", "WARNING", "WATCH"],
      },
    })
    vi.mocked(useConvex).mockReturnValue({ query })

    renderHook(() =>
      useExpiryRiskAlerts({
        windowDays: 30,
        filters: {
          productIds: ["product-1"],
          categories: ["Medicaments"],
          supplierIds: ["supplier-1"],
          severities: ["CRITICAL"],
        },
      })
    )

    await waitFor(() => expect(query).toHaveBeenCalled())

    expect(query).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clerkOrgId: "org-1",
        windowDays: 30,
        filters: {
          productIds: ["product-1"],
          categories: ["Medicaments"],
          supplierIds: ["supplier-1"],
          severities: ["CRITICAL"],
        },
      })
    )
  })
})
