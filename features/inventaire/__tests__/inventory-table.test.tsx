import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"

import { InventoryTable } from "@/features/inventaire/inventory-table"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

describe("InventoryTable", () => {
  it("sorts rows when a header is clicked", async () => {
    const user = userEvent.setup()
    render(
      <InventoryTable
        items={[
          {
            id: "1",
            name: "Zinc",
            barcode: "111",
            stock: 4,
            threshold: 2,
            purchasePrice: 10,
            sellingPrice: 14,
            vatRate: 7,
            category: "Medicaments",
            dosageForm: "Comprime",
          },
          {
            id: "2",
            name: "Aspirine",
            barcode: "222",
            stock: 9,
            threshold: 2,
            purchasePrice: 8,
            sellingPrice: 12,
            vatRate: 7,
            category: "Medicaments",
            dosageForm: "Comprime",
          },
        ]}
        pageSize={10}
      />
    )

    await user.click(screen.getByRole("button", { name: "Trier par Produits" }))

    const rows = screen.getAllByRole("row").slice(1)
    expect(within(rows[0]).getByText("Aspirine")).toBeInTheDocument()
    expect(within(rows[1]).getByText("Zinc")).toBeInTheDocument()
  })
})
