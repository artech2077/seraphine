import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"

import { StockAdjustmentModal } from "@/features/inventaire/stock-adjustment-modal"

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

describe("StockAdjustmentModal", () => {
  beforeEach(() => {
    mockedToast.success.mockClear()
    mockedToast.error.mockClear()
  })

  it("shows a validation error when reason is missing", async () => {
    const user = userEvent.setup()

    render(
      <StockAdjustmentModal
        open
        items={[
          {
            id: "product-1",
            name: "Doliprane",
            barcode: "611111",
            stock: 10,
            threshold: 3,
            purchasePrice: 10,
            sellingPrice: 15,
            vatRate: 7,
            category: "Medicaments",
            dosageForm: "Comprime",
          },
        ]}
      />
    )

    await user.click(screen.getByRole("button", { name: "Appliquer" }))

    expect(mockedToast.error).toHaveBeenCalledWith("Le motif d'ajustement est requis.")
  })

  it("submits adjustment payload and confirms before/after quantities", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <StockAdjustmentModal
        open
        items={[
          {
            id: "product-1",
            name: "Doliprane",
            barcode: "611111",
            stock: 10,
            threshold: 3,
            purchasePrice: 10,
            sellingPrice: 15,
            vatRate: 7,
            category: "Medicaments",
            dosageForm: "Comprime",
          },
        ]}
        onSubmit={onSubmit}
      />
    )

    await user.clear(screen.getByLabelText("Quantité"))
    await user.type(screen.getByLabelText("Quantité"), "2")
    await user.type(screen.getByLabelText("Motif"), "Casse")
    await user.type(screen.getByLabelText("Note (optionnel)"), "Boite tombee")

    expect(screen.getByText("Stock avant")).toBeInTheDocument()
    expect(screen.getByText("Stock après")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Appliquer" }))

    expect(onSubmit).toHaveBeenCalledWith({
      productId: "product-1",
      direction: "OUT",
      quantity: 2,
      reason: "Casse",
      note: "Boite tombee",
    })
    expect(mockedToast.success).toHaveBeenCalledWith("Stock ajusté pour Doliprane: 10 -> 8.")
  })
})
