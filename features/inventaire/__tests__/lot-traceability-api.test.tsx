import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { useLotTraceabilityReport } from "@/features/inventaire/api"
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

describe("useLotTraceabilityReport", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockClerkAuth({ orgId: "org-1" }))
    vi.mocked(useConvex).mockReset()
  })

  it("maps lot traceability report payload", async () => {
    const query = vi.fn().mockResolvedValue({
      lotNumber: "LOT-001",
      items: [
        {
          lotId: "lot-1",
          productId: "product-1",
          productName: "Doliprane",
          productCategory: "Medicaments",
          lotNumber: "LOT-001",
          expiryDate: Date.parse("2026-03-01"),
          currentBalance: 2,
          receivedQuantity: 5,
          soldQuantity: 3,
          supplierId: "supplier-1",
          supplierName: "Pharma Distribution",
          recallReportPath: "/app/inventaire?lotNumber=LOT-001",
          timeline: [
            {
              id: "receive-1",
              createdAt: 100,
              eventType: "RECEPTION",
              delta: 5,
              reason: "Reception fournisseur",
              reference: "BL-01",
            },
          ],
        },
      ],
    })
    vi.mocked(useConvex).mockReturnValue({ query })

    const { result } = renderHook(() => useLotTraceabilityReport("LOT-001"))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.lotNumber).toBe("LOT-001")
    expect(result.current.items).toEqual([
      expect.objectContaining({
        lotId: "lot-1",
        productName: "Doliprane",
        receivedQuantity: 5,
        soldQuantity: 3,
        currentBalance: 2,
      }),
    ])
  })

  it("skips query when lot number is empty", async () => {
    const query = vi.fn()
    vi.mocked(useConvex).mockReturnValue({ query })

    const { result } = renderHook(() => useLotTraceabilityReport("   "))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(query).not.toHaveBeenCalled()
  })
})
