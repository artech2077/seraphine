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
            id: "PO-2",
            supplier: "Beta",
            channel: "Email",
            createdAt: "2026-01-02",
            orderDate: "2026-01-02",
            total: 400,
            status: "Commandé",
            items: [],
          },
          {
            id: "PO-1",
            supplier: "Alpha",
            channel: "Email",
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

    const sortButton = screen.getByRole("button", { name: "Trier par Total" })
    await user.click(sortButton)
    const ids = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.textContent)

    expect(ids[0]).toContain("PO-1")
    expect(ids[1]).toContain("PO-2")
  })
})
