import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { SalesPos } from "@/features/ventes/sales-pos"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

vi.mock("@/features/clients/api", () => ({
  useClients: () => ({ items: [] }),
}))

vi.mock("@/features/inventaire/api", () => ({
  useProductCatalog: () => ({ items: [] }),
}))

vi.mock("@/features/ventes/api", () => ({
  useSalesHistory: () => ({
    createSale: vi.fn(),
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("SalesPos", () => {
  it("adds a new line when clicking add line", async () => {
    const user = userEvent.setup()
    render(<SalesPos />)

    expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(1)

    await user.click(screen.getByRole("button", { name: "Ajouter une ligne" }))

    expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(2)
  })
})
