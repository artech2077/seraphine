import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ClientsTable } from "@/features/clients/clients-table"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

describe("ClientsTable", () => {
  it("sorts by plafond when header is clicked", async () => {
    const user = userEvent.setup()
    render(
      <ClientsTable
        items={[
          {
            id: "client-2",
            clientNumber: "CLI-02",
            name: "Beta",
            phone: "",
            city: "",
            plafond: 200,
            encours: 0,
            status: "OK",
            lastPurchase: "2024-01-01",
          },
          {
            id: "client-1",
            clientNumber: "CLI-01",
            name: "Alpha",
            phone: "",
            city: "",
            plafond: 50,
            encours: 0,
            status: "OK",
            lastPurchase: "2024-01-01",
          },
        ]}
      />
    )

    const sortButton = screen.getByRole("button", { name: "Trier par Plafond" })
    await user.click(sortButton)
    const rows = screen.getAllByRole("row").slice(1)

    expect(rows[0]).toHaveTextContent("Alpha")
    expect(rows[1]).toHaveTextContent("Beta")
  })
})
