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
  useProductCatalog: () => ({
    items: [
      {
        id: "prod-1",
        name: "Café",
        sellingPrice: 10,
        vatRate: 20,
      },
    ],
  }),
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

    const addButton = screen.getByRole("button", { name: "Ajouter une ligne" })
    expect(addButton).toBeDisabled()

    const productInput = screen.getByPlaceholderText("Chercher ou scanner le code barre")
    await user.click(productInput)
    await user.click(screen.getByText("Café"))

    expect(screen.getByLabelText("Quantité")).toHaveValue(1)
    expect(addButton).toBeEnabled()

    await user.click(addButton)

    expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(2)
  })

  it("merges duplicate products into the existing line", async () => {
    const user = userEvent.setup()
    render(<SalesPos />)

    const productInput = screen.getByPlaceholderText("Chercher ou scanner le code barre")
    await user.click(productInput)
    await user.click(screen.getByText("Café"))

    const addButton = screen.getByRole("button", { name: "Ajouter une ligne" })
    await user.click(addButton)

    const productInputs = screen.getAllByPlaceholderText("Chercher ou scanner le code barre")
    await user.click(productInputs[1])
    const cafeOptions = screen.getAllByText("Café")
    await user.click(cafeOptions[cafeOptions.length - 1])

    expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(1)
    expect(screen.getByLabelText("Quantité")).toHaveValue(2)
  })
})
