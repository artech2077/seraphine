import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"

import { InventoryProductModal } from "@/features/inventaire/inventory-product-modal"

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

describe("InventoryProductModal", () => {
  beforeEach(() => {
    mockedToast.success.mockClear()
    mockedToast.error.mockClear()
  })

  it("shows a validation error when name is missing", async () => {
    const user = userEvent.setup()
    render(<InventoryProductModal mode="create" open />)

    await user.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(mockedToast.error).toHaveBeenCalledWith("Le nom du produit est requis.")
  })

  it("submits updated values in edit mode", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <InventoryProductModal
        mode="edit"
        open
        item={{
          id: "product-1",
          name: "Doliprane",
          barcode: "123",
          stock: 12,
          threshold: 3,
          purchasePrice: 10,
          sellingPrice: 14,
          vatRate: 7,
          category: "Medicaments",
          dosageForm: "Comprime",
        }}
        onSubmit={onSubmit}
      />
    )

    const nameInput = screen.getByLabelText("Nom du produit")
    await user.clear(nameInput)
    await user.type(nameInput, "Updated")

    await user.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Updated",
        category: "Medicaments",
        vatRate: 7,
      }),
      expect.objectContaining({
        id: "product-1",
      })
    )
  })
})
