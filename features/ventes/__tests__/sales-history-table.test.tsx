import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { SalesHistoryTable, type SaleHistoryItem } from "@/features/ventes/sales-history-table"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

const sales: SaleHistoryItem[] = [
  {
    id: "V-002",
    date: "01 janv. 2026",
    client: "Client B",
    seller: "Nora",
    paymentMethod: "Espèce",
    globalDiscount: "-",
    amountTtc: 200,
    items: [
      {
        id: "line-2",
        product: "Produit B",
        quantity: 1,
        unitPriceHt: 100,
        vatRate: 20,
        discount: "-",
        totalTtc: 120,
      },
    ],
  },
  {
    id: "V-001",
    date: "02 janv. 2026",
    client: "Client A",
    seller: "Yassine",
    paymentMethod: "Carte",
    globalDiscount: "10%",
    amountTtc: 120,
    items: [
      {
        id: "line-1",
        product: "Produit A",
        quantity: 2,
        unitPriceHt: 50,
        vatRate: 20,
        discount: "10%",
        totalTtc: 108,
      },
    ],
  },
]

describe("SalesHistoryTable", () => {
  it("sorts by amount when header is clicked", async () => {
    render(<SalesHistoryTable sales={sales} />)

    await screen.findByText("V-001")

    const user = userEvent.setup()
    const beforeOrder = getSaleRowIds()
    const sortButton = screen.getByRole("button", { name: "Trier par Montant" })
    await user.click(sortButton)
    await user.click(sortButton)
    const afterOrder = getSaleRowIds()

    expect(beforeOrder).toEqual(["V-001", "V-002"])
    expect(afterOrder).toEqual(["V-002", "V-001"])
  })
})

function getSaleRowIds() {
  const rows = screen.getAllByRole("row")
  return rows
    .map((row) => within(row).queryByText(/V-00/))
    .filter(Boolean)
    .map((node) => node?.textContent)
}
