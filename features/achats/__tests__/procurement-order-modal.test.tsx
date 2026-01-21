import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ProcurementOrderModal } from "@/features/achats/procurement-order-modal"

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

describe("ProcurementOrderModal", () => {
  it("adds a new line when clicking add line", async () => {
    const user = userEvent.setup()

    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={[{ id: "prod-1", name: "Produit A", unitPrice: 10 }]}
      />
    )

    expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(1)

    await user.click(screen.getByRole("button", { name: "Ajouter une ligne" }))

    expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(2)
  })
})
