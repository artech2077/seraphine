import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"

import { StocktakeManagementCard } from "@/features/inventaire/stocktake-management-card"

const mockUseStocktakeSessions = vi.fn()

vi.mock("@/features/inventaire/api", () => ({
  useStocktakeSessions: (...args: unknown[]) => mockUseStocktakeSessions(...args),
}))

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("StocktakeManagementCard", () => {
  it("renders stocktake sessions and opens details", async () => {
    const user = userEvent.setup()
    const startSession = vi.fn()
    const finalizeSession = vi.fn()

    mockUseStocktakeSessions.mockReturnValue({
      sessions: [
        {
          id: "stocktake-1",
          name: "Comptage Hebdo",
          status: "COUNTING",
          createdAt: 1700000000000,
          startedAt: 1700000010000,
          finalizedAt: null,
          itemsCount: 2,
          countedCount: 0,
          varianceCount: 0,
        },
      ],
      selectedSession: {
        id: "stocktake-1",
        name: "Comptage Hebdo",
        status: "COUNTING",
        createdAt: 1700000000000,
        startedAt: 1700000010000,
        finalizedAt: null,
        items: [
          {
            id: "item-1",
            productId: "product-1",
            productName: "Doliprane",
            expectedQuantity: 10,
            countedQuantity: null,
            varianceQuantity: null,
            note: "",
          },
        ],
      },
      isLoading: false,
      hasOrg: true,
      createSession: vi.fn(),
      startSession,
      finalizeSession,
    })

    render(<StocktakeManagementCard />)

    expect(screen.getByText("Comptage Hebdo")).toBeInTheDocument()
    expect(screen.getByText("Comptage")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Ouvrir" }))

    expect(screen.getByText("Doliprane")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Finaliser et appliquer" })).toBeInTheDocument()
    expect(startSession).not.toHaveBeenCalled()
    expect(finalizeSession).not.toHaveBeenCalled()
  })

  it("triggers session creation from action button", async () => {
    const user = userEvent.setup()
    const createSession = vi.fn().mockResolvedValue("stocktake-2")

    mockUseStocktakeSessions.mockReturnValue({
      sessions: [],
      selectedSession: null,
      isLoading: false,
      hasOrg: true,
      createSession,
      startSession: vi.fn(),
      finalizeSession: vi.fn(),
    })

    render(<StocktakeManagementCard />)

    await user.click(screen.getByRole("button", { name: "Nouveau comptage" }))
    expect(createSession).toHaveBeenCalled()
  })
})
