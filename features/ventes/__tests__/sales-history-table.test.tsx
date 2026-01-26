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
    id: "sale-2",
    saleNumber: "FAC-02",
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
    id: "sale-1",
    saleNumber: "FAC-01",
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

    await screen.findByText("FAC-01")

    const user = userEvent.setup()
    const beforeOrder = getSaleRowIds()
    const sortButton = screen.getByRole("button", { name: "Trier par Montant" })
    await user.click(sortButton)
    await user.click(sortButton)
    const afterOrder = getSaleRowIds()

    expect(beforeOrder).toEqual(["FAC-01", "FAC-02"])
    expect(afterOrder).toEqual(["FAC-02", "FAC-01"])
  })

  it("paginates sales when page size is provided", () => {
    const { rerender } = render(<SalesHistoryTable sales={sales} page={1} pageSize={1} />)

    expect(getSaleRowIds()).toEqual(["FAC-01"])

    rerender(<SalesHistoryTable sales={sales} page={2} pageSize={1} />)

    expect(getSaleRowIds()).toEqual(["FAC-02"])
  })

  it("triggers edit callback when modifier is clicked", async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()

    render(<SalesHistoryTable sales={sales} onEdit={onEdit} />)

    const saleRow = screen.getByText("FAC-01").closest("tr")
    expect(saleRow).not.toBeNull()

    const menuButton = within(saleRow as HTMLElement).getByRole("button", {
      name: "Ouvrir le menu",
    })
    await user.click(menuButton)

    const editItem = await screen.findByRole("menuitem", { name: "Modifier" })
    await user.click(editItem)

    expect(onEdit).toHaveBeenCalledWith(sales[1])
  })
})

function getSaleRowIds() {
  const rows = screen.getAllByRole("row")
  return rows
    .map((row) => within(row).queryByText(/FAC-\d+/))
    .filter(Boolean)
    .map((node) => node?.textContent)
}
