import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { SalesPos } from "@/features/ventes/sales-pos"
import { useSalesHistory } from "@/features/ventes/api"

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
        barcode: "123",
        sellingPrice: 10,
        vatRate: 20,
      },
    ],
  }),
}))

vi.mock("@/features/ventes/api", () => ({
  useSalesHistory: vi.fn(() => ({
    createSale: vi.fn(),
    updateSale: vi.fn(),
  })),
}))

const scanHandlers: Array<(barcode: string) => void> = []

vi.mock("@/hooks/use-barcode-scanner", () => ({
  useBarcodeScanner: ({ onScan }: { onScan: (barcode: string) => void }) => {
    scanHandlers.push(onScan)
  },
}))

vi.mock("convex/react", async () => {
  const actual = await vi.importActual<typeof import("convex/react")>("convex/react")
  return {
    ...actual,
    useQuery: () => undefined,
  }
})

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ orgId: "org-1", userId: "user-1" }),
}))

describe("SalesPos", () => {
  beforeEach(() => {
    scanHandlers.length = 0
  })
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

  it("prefills data when editing a sale and updates on save", async () => {
    const user = userEvent.setup()
    const updateSale = vi.fn()
    vi.mocked(useSalesHistory).mockReturnValue({
      createSale: vi.fn(),
      updateSale,
    } as ReturnType<typeof useSalesHistory>)

    render(
      <SalesPos
        editingSale={{
          id: "sale-1",
          saleNumber: "FAC-01",
          date: "02 janv. 2026",
          client: "Client A",
          seller: "Nora",
          paymentMethod: "Espèce",
          paymentMethodValue: "cash",
          globalDiscount: "-",
          globalDiscountType: "percent",
          globalDiscountValue: 0,
          amountTtc: 120,
          items: [
            {
              id: "line-1",
              productId: "prod-1",
              product: "Café",
              quantity: 1,
              unitPriceHt: 10,
              vatRate: 20,
              discountType: "percent",
              discountValue: 0,
              discount: "-",
              totalTtc: 12,
            },
          ],
        }}
      />
    )

    expect(screen.getByLabelText("Quantité")).toHaveValue(1)

    const saveButton = screen.getByRole("button", { name: "Mettre à jour la vente" })
    await user.click(saveButton)

    expect(updateSale).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sale-1",
        paymentMethod: "cash",
      })
    )
  })

  it("adds a product line when scanning a barcode", async () => {
    render(<SalesPos />)

    await act(async () => {
      scanHandlers[0]?.("123")
    })

    expect(await screen.findAllByDisplayValue("Café")).not.toHaveLength(0)
    expect(screen.getByLabelText("Quantité")).toHaveValue(1)
  })
})
