import { act, fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"

import { LowStockAlert } from "@/features/alerts/low-stock-alert"

vi.mock("@/features/alerts/api", () => ({
  useLowStockAlertSummary: vi.fn(),
  useLowStockAlertActions: vi.fn(),
}))

vi.mock("@/features/fournisseurs/api", () => ({
  useSuppliers: vi.fn(),
}))

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({ canManage: () => true }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const { useLowStockAlertSummary, useLowStockAlertActions } = await import("@/features/alerts/api")
const { useSuppliers } = await import("@/features/fournisseurs/api")

describe("LowStockAlert", () => {
  beforeEach(() => {
    vi.mocked(useLowStockAlertActions).mockReturnValue({
      createLowStockDraft: vi.fn().mockResolvedValue("order-1"),
      syncLowStockDraft: vi.fn().mockResolvedValue(null),
    } as ReturnType<typeof useLowStockAlertActions>)
    vi.mocked(useSuppliers).mockReturnValue({
      items: [],
      isLoading: false,
    } as ReturnType<typeof useSuppliers>)
  })

  it("renders the singular message", () => {
    vi.mocked(useLowStockAlertSummary).mockReturnValue({
      summary: {
        count: 1,
        signature: "product-1",
        hasActiveDraft: false,
        isHandled: false,
      },
    } as ReturnType<typeof useLowStockAlertSummary>)

    render(<LowStockAlert />)

    expect(
      screen.getByText("1 produit est en stock bas et doit être réapprovisionné.")
    ).toBeInTheDocument()
  })

  it("renders the plural message", () => {
    vi.mocked(useLowStockAlertSummary).mockReturnValue({
      summary: {
        count: 3,
        signature: "product-1|product-2|product-3",
        hasActiveDraft: false,
        isHandled: false,
      },
    } as ReturnType<typeof useLowStockAlertSummary>)

    render(<LowStockAlert />)

    expect(
      screen.getByText("3 produits sont en stock bas et doivent être réapprovisionnés.")
    ).toBeInTheDocument()
  })

  it("updates CTA label when draft exists", () => {
    vi.mocked(useLowStockAlertSummary).mockReturnValue({
      summary: {
        count: 2,
        signature: "product-1|product-2",
        hasActiveDraft: true,
        activeOrderId: "order-1",
        lastSyncedSignature: "product-1|product-2",
        isHandled: false,
      },
    } as ReturnType<typeof useLowStockAlertSummary>)

    render(<LowStockAlert />)

    expect(screen.getByText("Ouvrir le bon de commande")).toBeInTheDocument()
  })

  it("reappears after dismissal", () => {
    vi.useFakeTimers()
    vi.mocked(useLowStockAlertSummary).mockReturnValue({
      summary: {
        count: 1,
        signature: "product-1",
        hasActiveDraft: false,
        isHandled: false,
      },
    } as ReturnType<typeof useLowStockAlertSummary>)

    render(<LowStockAlert />)

    fireEvent.click(screen.getByLabelText("Masquer l'alerte"))

    expect(
      screen.queryByText("1 produit est en stock bas et doit être réapprovisionné.")
    ).not.toBeInTheDocument()
    expect(screen.getByText("Tester l'alerte")).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(30 * 1000)
    })

    expect(
      screen.getByText("1 produit est en stock bas et doit être réapprovisionné.")
    ).toBeInTheDocument()

    vi.useRealTimers()
  })

  it("shows alert even when handled and keeps the test button", () => {
    vi.mocked(useLowStockAlertSummary).mockReturnValue({
      summary: {
        count: 2,
        signature: "product-1|product-2",
        hasActiveDraft: false,
        isHandled: true,
      },
    } as ReturnType<typeof useLowStockAlertSummary>)

    render(<LowStockAlert />)

    expect(
      screen.getByText("2 produits sont en stock bas et doivent être réapprovisionnés.")
    ).toBeInTheDocument()
    expect(screen.getByText("Tester l'alerte")).toBeInTheDocument()
  })
})
