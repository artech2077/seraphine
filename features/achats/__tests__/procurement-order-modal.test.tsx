import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ProcurementOrderModal } from "@/features/achats/procurement-order-modal"

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => ({
    canManage: () => true,
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("ProcurementOrderModal", () => {
  it("blocks adding a line until a product and quantity are set", async () => {
    const user = userEvent.setup()

    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={[{ id: "prod-1", name: "Produit A", unitPrice: 10 }]}
      />
    )

    const addLineButton = screen.getByRole("button", { name: "Ajouter une ligne" })
    expect(addLineButton).toBeDisabled()
    expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(1)

    await user.click(addLineButton)

    expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(1)
  })

  it("shows due date field and summary", () => {
    render(
      <ProcurementOrderModal
        mode="create"
        variant="delivery"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={[{ id: "prod-1", name: "Produit A", unitPrice: 10 }]}
      />
    )

    expect(screen.getByLabelText("Date d'échéance")).toBeInTheDocument()
    expect(screen.getByLabelText("Statut")).toBeInTheDocument()
    expect(screen.getByLabelText("Valeur remise globale")).toBeInTheDocument()
    expect(screen.getByText("Total de la commande")).toBeInTheDocument()
  })

  it("hides delivery-only fields for purchase orders", () => {
    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={[{ id: "prod-1", name: "Produit A", unitPrice: 10 }]}
      />
    )

    expect(screen.queryByText("Canal")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Date d'échéance")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Valeur remise globale")).not.toBeInTheDocument()
    expect(screen.queryByText("Remise ligne")).not.toBeInTheDocument()
  })

  it("adds a new line after selecting a product and quantity", async () => {
    const user = userEvent.setup()

    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={[{ id: "prod-1", name: "Produit A", unitPrice: 10 }]}
      />
    )

    const productInput = screen.getByLabelText("Produit")
    await user.click(productInput)
    await user.type(productInput, "Produit A")
    await user.click(await screen.findByRole("option", { name: "Produit A" }))

    const quantityInput = screen.getByLabelText("Quantité")
    expect(quantityInput).toHaveValue(1)

    const addLineButton = screen.getByRole("button", { name: "Ajouter une ligne" })
    expect(addLineButton).toBeEnabled()

    await user.click(addLineButton)

    expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(2)
  })

  it("updates the total after selecting a product", async () => {
    const user = userEvent.setup()

    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={[{ id: "prod-1", name: "Produit A", unitPrice: 10 }]}
      />
    )

    const productInput = screen.getByLabelText("Produit")
    await user.click(productInput)
    await user.type(productInput, "Produit A")
    await user.click(await screen.findByRole("option", { name: "Produit A" }))

    await waitFor(() => {
      const totalRow = screen.getByText("Total de la commande").parentElement
      expect(totalRow).toHaveTextContent("10,00 MAD")
    })
  })

  it("merges duplicate products by increasing quantity", async () => {
    const user = userEvent.setup()

    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={[{ id: "prod-1", name: "Produit A", unitPrice: 10 }]}
      />
    )

    const productInputs = screen.getAllByLabelText("Produit")
    await user.click(productInputs[0])
    await user.type(productInputs[0], "Produit A")
    await user.click(await screen.findByRole("option", { name: "Produit A" }))

    const quantityInputs = screen.getAllByLabelText("Quantité")
    await user.clear(quantityInputs[0])
    await user.type(quantityInputs[0], "2")

    await user.click(screen.getByRole("button", { name: "Ajouter une ligne" }))

    const nextProductInput = screen.getAllByLabelText("Produit")[1]
    await user.click(nextProductInput)
    await user.type(nextProductInput, "Produit A")
    await user.click(await screen.findByRole("option", { name: "Produit A" }))

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(1)
    })

    expect(screen.getByLabelText("Quantité")).toHaveValue(3)
  })
})
