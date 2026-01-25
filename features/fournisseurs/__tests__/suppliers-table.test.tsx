import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { SuppliersTable } from "@/features/fournisseurs/suppliers-table"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

describe("SuppliersTable", () => {
  it("sorts by balance when header is clicked", async () => {
    const user = userEvent.setup()
    render(
      <SuppliersTable
        items={[
          {
            id: "sup-2",
            supplierNumber: "FOUR-02",
            name: "Beta",
            email: "",
            phone: "",
            city: "",
            balance: 50,
          },
          {
            id: "sup-1",
            supplierNumber: "FOUR-01",
            name: "Alpha",
            email: "",
            phone: "",
            city: "",
            balance: -10,
          },
        ]}
      />
    )

    const sortButton = screen.getByRole("button", { name: "Trier par Balance" })
    await user.click(sortButton)
    const rows = screen.getAllByRole("row").slice(1)

    expect(rows[0]).toHaveTextContent("Alpha")
    expect(rows[1]).toHaveTextContent("Beta")
  })
})
