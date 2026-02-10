import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ProductSearchPanel } from "@/features/products/product-search-panel"

const PRODUCTS = [
  {
    id: "prod-1",
    name: "Paracétamol 1g",
    barcode: "1001",
    category: "Médicaments",
    sellingPrice: 18,
    stockQuantity: 20,
    lowStockThreshold: 5,
  },
  {
    id: "prod-2",
    name: "Vitamine C",
    barcode: "2002",
    category: "Parapharmacie",
    sellingPrice: 32,
    stockQuantity: 3,
    lowStockThreshold: 6,
  },
]

describe("ProductSearchPanel", () => {
  it("is collapsed by default and shows empty state when expanded without query", async () => {
    const user = userEvent.setup()

    render(<ProductSearchPanel products={PRODUCTS} onAddProduct={vi.fn()} contextLabel="POS" />)

    expect(screen.getByRole("button", { name: "Afficher la recherche" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Nom")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Afficher la recherche" }))

    expect(screen.getByText("Commencez par saisir une recherche")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ajouter" })).not.toBeInTheDocument()
  })

  it("filters by product name and adds the selected result", async () => {
    const user = userEvent.setup()
    const onAddProduct = vi.fn()

    render(
      <ProductSearchPanel products={PRODUCTS} onAddProduct={onAddProduct} contextLabel="POS" />
    )

    await user.click(screen.getByRole("button", { name: "Afficher la recherche" }))
    const nameInput = screen.getByLabelText("Nom")
    await user.type(nameInput, "Vitamine")

    const addButtons = screen.getAllByRole("button", { name: "Ajouter" })
    expect(addButtons).toHaveLength(1)

    await user.click(addButtons[0])

    expect(onAddProduct).toHaveBeenCalledWith(expect.objectContaining({ id: "prod-2" }))
  })

  it("adds the highlighted product with Enter key", async () => {
    const user = userEvent.setup()
    const onAddProduct = vi.fn()

    render(
      <ProductSearchPanel products={PRODUCTS} onAddProduct={onAddProduct} contextLabel="POS" />
    )

    await user.click(screen.getByRole("button", { name: "Afficher la recherche" }))
    const nameInput = screen.getByLabelText("Nom")
    await user.type(nameInput, "Paracétamol{enter}")

    expect(onAddProduct).toHaveBeenCalledWith(expect.objectContaining({ id: "prod-1" }))
  })
})
