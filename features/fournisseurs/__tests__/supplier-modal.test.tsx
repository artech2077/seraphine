import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { SupplierModal } from "@/features/fournisseurs/supplier-modal"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

describe("SupplierModal", () => {
  it("submits entered supplier details", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<SupplierModal mode="create" open onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText("Fournisseur"), "Fournisseur A")
    await user.type(screen.getByLabelText("Balance"), "120")

    await user.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Fournisseur A",
        balance: 120,
      }),
      undefined
    )
  })
})
