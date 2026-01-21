import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ReconciliationHistoryTable } from "@/features/reconciliation/reconciliation-history-table"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

describe("ReconciliationHistoryTable", () => {
  it("sorts by difference when header is clicked", async () => {
    const user = userEvent.setup()
    render(
      <ReconciliationHistoryTable
        items={[
          {
            id: "day-1",
            date: "2026-01-02",
            opening: 100,
            expected: 100,
            counted: 90,
          },
          {
            id: "day-2",
            date: "2026-01-03",
            opening: 100,
            expected: 100,
            counted: 140,
          },
        ]}
      />
    )

    const sortButton = screen.getByRole("button", { name: "Trier par Écart" })
    await user.click(sortButton)

    const rows = screen.getAllByRole("row").slice(1)
    expect(rows[0]).toHaveTextContent("02/01/2026")
    expect(rows[1]).toHaveTextContent("03/01/2026")
  })
})
