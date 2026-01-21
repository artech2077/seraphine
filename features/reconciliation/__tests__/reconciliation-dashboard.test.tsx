import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"

import { ReconciliationDashboard } from "@/features/reconciliation/reconciliation-dashboard"

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

const { toast } = await import("sonner")

const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

describe("ReconciliationDashboard", () => {
  beforeEach(() => {
    mockedToast.success.mockClear()
    mockedToast.error.mockClear()
  })

  it("confirms opening values", async () => {
    const user = userEvent.setup()
    const onUpdateDay = vi.fn().mockResolvedValue(undefined)

    render(
      <ReconciliationDashboard
        days={[
          {
            id: "day-1",
            date: "2026-01-02",
            opening: null,
            openingLocked: false,
            sales: 200,
            withdrawals: 10,
            adjustments: 0,
            actual: null,
            isLocked: false,
          },
        ]}
        onUpdateDay={onUpdateDay}
      />
    )

    const inputs = screen.getAllByPlaceholderText("Montant")
    await user.clear(inputs[0])
    await user.type(inputs[0], "100")

    await user.click(screen.getByRole("button", { name: "Confirmer l'ouverture" }))

    expect(onUpdateDay).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "day-1",
        opening: 100,
        openingLocked: true,
      })
    )
    expect(mockedToast.success).toHaveBeenCalled()
  })
})
