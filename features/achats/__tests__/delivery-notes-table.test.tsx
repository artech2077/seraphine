import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { DeliveryNotesTable } from "@/features/achats/achats-delivery-notes-table"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

describe("DeliveryNotesTable", () => {
  it("sorts by reference when header is clicked", async () => {
    const user = userEvent.setup()
    render(
      <DeliveryNotesTable
        notes={[
          {
            id: "note-2",
            orderNumber: "BL-02",
            supplier: "Beta",
            channel: "Portail",
            createdAt: "2026-01-02",
            orderDate: "2026-01-02",
            externalReference: "REF-2",
            total: 300,
            status: "En cours",
            items: [],
          },
          {
            id: "note-1",
            orderNumber: "BL-01",
            supplier: "Alpha",
            channel: "Portail",
            createdAt: "2026-01-01",
            orderDate: "2026-01-01",
            externalReference: "REF-1",
            total: 100,
            status: "Brouillon",
            items: [],
          },
        ]}
        suppliers={[]}
        products={[]}
      />
    )

    const sortButton = screen.getByRole("button", { name: "Trier par Réf livraison" })
    await user.click(sortButton)
    const ids = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.textContent)

    expect(ids[0]).toContain("BL-01")
    expect(ids[1]).toContain("BL-02")
  })
})
