import { act, render, screen, waitFor } from "@testing-library/react"
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

vi.mock("convex/react", async () => {
  const actual = await vi.importActual<typeof import("convex/react")>("convex/react")
  return {
    ...actual,
    useQuery: () => undefined,
  }
})

const scanHandlers: Array<(barcode: string) => void> = []

vi.mock("@/hooks/use-barcode-scanner", () => ({
  useBarcodeScanner: ({ onScan }: { onScan: (barcode: string) => void }) => {
    scanHandlers.push(onScan)
  },
}))

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ orgId: "org-1", userId: "user-1" }),
}))

const PRODUCTS = [
  {
    id: "prod-1",
    name: "Produit A",
    unitPrice: 10,
    sellingPrice: 15,
    vatRate: 7,
    barcode: "900",
    category: "Médicaments",
    stockQuantity: 20,
    lowStockThreshold: 5,
  },
]

describe("ProcurementOrderModal", () => {
  beforeEach(() => {
    scanHandlers.length = 0
  })
  it("starts with no product line and adds one from the search panel", async () => {
    const user = userEvent.setup()

    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={PRODUCTS}
      />
    )

    expect(screen.queryByRole("button", { name: "Supprimer la ligne" })).not.toBeInTheDocument()
    expect(screen.getByText(/Aucun produit sélectionné/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ajouter" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Afficher la recherche" }))
    await user.type(screen.getByLabelText("Nom"), "Produit A")
    await user.click(screen.getByRole("button", { name: "Ajouter" }))

    expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(1)
    expect(screen.getByLabelText("Quantité")).toHaveValue(1)
  })

  it("shows due date field and summary", () => {
    render(
      <ProcurementOrderModal
        mode="create"
        variant="delivery"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={PRODUCTS}
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
        products={PRODUCTS}
      />
    )

    expect(screen.queryByText("Canal")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Date d'échéance")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Valeur remise globale")).not.toBeInTheDocument()
    expect(screen.queryByText("Remise ligne")).not.toBeInTheDocument()
  })

  it("adds a new line from the search panel", async () => {
    const user = userEvent.setup()

    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={PRODUCTS}
      />
    )

    await user.click(screen.getByRole("button", { name: "Afficher la recherche" }))
    await user.type(screen.getByLabelText("Nom"), "Produit A")
    await user.click(screen.getByRole("button", { name: "Ajouter" }))

    expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(1)
    expect(screen.getByLabelText("Quantité")).toHaveValue(1)
  })

  it("updates the total after adding a product", async () => {
    const user = userEvent.setup()

    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={PRODUCTS}
      />
    )

    await user.click(screen.getByRole("button", { name: "Afficher la recherche" }))
    await user.type(screen.getByLabelText("Nom"), "Produit A")
    await user.click(screen.getByRole("button", { name: "Ajouter" }))

    await waitFor(() => {
      const totalRow = screen.getByText("Total de la commande").parentElement
      expect(totalRow).toHaveTextContent("10,00 MAD")
    })

    const totalPpvRow = screen.getByText("Total PPV").parentElement
    expect(totalPpvRow).toHaveTextContent("16,05 MAD")
    expect(screen.getByText("7%")).toBeInTheDocument()
  })

  it("merges duplicate products by increasing quantity", async () => {
    const user = userEvent.setup()

    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={PRODUCTS}
      />
    )

    await user.click(screen.getByRole("button", { name: "Afficher la recherche" }))
    await user.type(screen.getByLabelText("Nom"), "Produit A")
    await user.click(screen.getByRole("button", { name: "Ajouter" }))

    const quantityInputs = screen.getAllByLabelText("Quantité")
    await user.clear(quantityInputs[0])
    await user.type(quantityInputs[0], "2")

    await user.click(screen.getByRole("button", { name: "Ajouter" }))

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Supprimer la ligne" })).toHaveLength(1)
    })

    expect(screen.getByLabelText("Quantité")).toHaveValue(3)
  })

  it("adds a product when scanning a barcode", async () => {
    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={PRODUCTS}
      />
    )

    await act(async () => {
      scanHandlers[0]?.("900")
    })

    expect(await screen.findAllByText("Produit A")).not.toHaveLength(0)
    expect(screen.getByLabelText("Quantité")).toHaveValue(1)
  })

  it("submits existing lines using stored product ids", async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()

    render(
      <ProcurementOrderModal
        mode="edit"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={[]}
        order={{
          id: "order-1",
          orderNumber: "BC-01",
          supplierId: "supplier-1",
          supplier: "Fournisseur A",
          channel: "Email",
          createdAt: "2026-01-01",
          orderDate: "2026-01-02",
          total: 100,
          status: "Commandé",
          items: [
            {
              id: "line-1",
              productId: "prod-1",
              product: "Produit A",
              quantity: 2,
              unitPrice: 50,
            },
          ],
        }}
        onSubmit={handleSubmit}
      />
    )

    await user.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled()
    })

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId: "supplier-1",
        items: [
          expect.objectContaining({
            productId: "prod-1",
            quantity: 2,
            unitPrice: 50,
          }),
        ],
      })
    )
  })

  it("does not send remise or delivery-only fields for purchase orders", async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()

    render(
      <ProcurementOrderModal
        mode="create"
        variant="purchase"
        open
        suppliers={[{ id: "supplier-1", name: "Fournisseur A" }]}
        products={PRODUCTS}
        onSubmit={handleSubmit}
      />
    )

    const supplierInput = screen.getByLabelText("Fournisseur")
    await user.click(supplierInput)
    await user.type(supplierInput, "Fournisseur A")
    await user.click(await screen.findByRole("option", { name: "Fournisseur A" }))

    const orderDateInput = screen.getByLabelText("Date de bon de commande")
    await user.type(orderDateInput, "2026-02-03")

    await user.click(screen.getByRole("button", { name: "Afficher la recherche" }))
    await user.type(screen.getByLabelText("Nom"), "Produit A")
    await user.click(screen.getByRole("button", { name: "Ajouter" }))

    await user.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: undefined,
        externalReference: undefined,
        globalDiscountType: undefined,
        globalDiscountValue: undefined,
        items: [
          expect.objectContaining({
            lineDiscountType: undefined,
            lineDiscountValue: undefined,
          }),
        ],
      })
    )
  })
})
