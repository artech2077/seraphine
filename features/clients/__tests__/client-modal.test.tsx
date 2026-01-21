import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ClientModal } from "@/features/clients/client-modal"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

describe("ClientModal", () => {
  it("submits entered client details", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<ClientModal mode="create" open onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText("Nom"), "Client A")
    await user.type(screen.getByLabelText("Plafond"), "150")
    await user.type(screen.getByLabelText("Encours"), "25")

    await user.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Client A",
        plafond: 150,
        encours: 25,
        status: "OK",
      }),
      undefined
    )
  })
})
