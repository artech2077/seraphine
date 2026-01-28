import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { PurchaseOrdersTable } from "@/features/achats/achats-purchase-orders-table"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

describe("PurchaseOrdersTable", () => {
  it("sorts by total when header is clicked", async () => {
    const user = userEvent.setup()
    render(
      <PurchaseOrdersTable
        orders={[
          {
            id: "order-2",
            orderNumber: "BC-02",
            supplier: "Beta",
            createdAt: "2026-01-02",
            orderDate: "2026-01-02",
            total: 400,
            status: "Commandé",
            items: [],
          },
          {
            id: "order-1",
            orderNumber: "BC-01",
            supplier: "Alpha",
            createdAt: "2026-01-01",
            orderDate: "2026-01-01",
            total: 100,
            status: "Brouillon",
            items: [],
          },
        ]}
        suppliers={[]}
        products={[]}
      />
    )

    expect(screen.getByText("Date du bon")).toBeInTheDocument()
    expect(screen.queryByText("Date d'échéance")).not.toBeInTheDocument()
    expect(screen.queryByText("Canal")).not.toBeInTheDocument()
    expect(screen.getByText("Statut")).toBeInTheDocument()

    const sortButton = screen.getByRole("button", { name: "Trier par Total" })
    await user.click(sortButton)
    const ids = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.textContent)

    expect(ids[0]).toContain("BC-01")
    expect(ids[1]).toContain("BC-02")
  })
})
