import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"

import { StockManagementPage } from "@/features/inventaire/stock-management-page"

const mockUseInventoryItems = vi.fn()
const mockUseExpiryRiskAlerts = vi.fn()
const mockUseLotTraceabilityReport = vi.fn()
const mockUseRoleAccess = vi.fn()

vi.mock("@/features/inventaire/api", () => ({
  useInventoryItems: () => mockUseInventoryItems(),
  useExpiryRiskAlerts: (...args: unknown[]) => mockUseExpiryRiskAlerts(...args),
  useLotTraceabilityReport: (...args: unknown[]) => mockUseLotTraceabilityReport(...args),
}))

vi.mock("@/features/inventaire/stocktake-management-card", () => ({
  StocktakeManagementCard: () => <div>Stocktake card</div>,
}))

vi.mock("@/lib/auth/use-role-access", () => ({
  useRoleAccess: () => mockUseRoleAccess(),
}))

describe("StockManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRoleAccess.mockReturnValue({
      canManage: () => true,
      canView: () => true,
    })
    mockUseExpiryRiskAlerts.mockReturnValue({
      items: [
        {
          lotId: "lot-1",
          productId: "product-1",
          productName: "Doliprane",
          productCategory: "Medicaments",
          lotNumber: "LOT-001",
          expiryDate: Date.parse("2026-02-20"),
          daysToExpiry: 9,
          quantity: 5,
          supplierId: "supplier-1",
          supplierName: "Pharma Distribution",
          severity: "CRITICAL",
          recommendedAction: "Prioriser la vente FEFO ou initier un retour fournisseur.",
          recommendedPathLabel: "Prioriser la vente",
          recommendedPathHref: "/app/ventes",
          lotDetailPath: "/app/produit?productId=product-1&lotNumber=LOT-001",
        },
      ],
      counts: {
        total: 1,
        expired: 0,
        dueIn30Days: 1,
        dueIn60Days: 1,
        dueIn90Days: 1,
      },
      filterOptions: {
        products: [{ id: "product-1", name: "Doliprane" }],
        categories: ["Medicaments"],
        suppliers: [{ id: "supplier-1", name: "Pharma Distribution" }],
        severities: ["EXPIRED", "CRITICAL", "WARNING", "WATCH"],
      },
      isLoading: false,
      isFetching: false,
      hasOrg: true,
    })
    mockUseLotTraceabilityReport.mockReturnValue({
      lotNumber: "",
      items: [],
      isLoading: false,
      isFetching: false,
      hasOrg: true,
    })
  })

  it("shows stock indicators and replenishment rows", () => {
    mockUseInventoryItems.mockReturnValue({
      items: [
        {
          id: "product-1",
          name: "Doliprane",
          barcode: "611111",
          stock: 0,
          threshold: 3,
          purchasePrice: 10,
          sellingPrice: 15,
          vatRate: 7,
          category: "Medicaments",
          dosageForm: "Comprime",
        },
        {
          id: "product-2",
          name: "Smecta",
          barcode: "622222",
          stock: 2,
          threshold: 4,
          purchasePrice: 12,
          sellingPrice: 18,
          vatRate: 7,
          category: "Medicaments",
          dosageForm: "Sachet",
        },
        {
          id: "product-3",
          name: "Vitamine C",
          barcode: "633333",
          stock: 12,
          threshold: 5,
          purchasePrice: 8,
          sellingPrice: 14,
          vatRate: 7,
          category: "Parapharmacie",
          dosageForm: "Comprime",
        },
      ],
      isLoading: false,
      hasOrg: true,
      adjustStock: vi.fn(),
    })

    render(<StockManagementPage />)

    expect(screen.getByText("Inventaire")).toBeInTheDocument()
    expect(screen.getByText("Produits suivis")).toBeInTheDocument()
    expect(screen.getAllByText("Stock bas").length).toBeGreaterThan(0)
    expect(screen.getByText("Ruptures")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ajuster stock" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Exporter alertes" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Exporter risques expiration" })).toBeInTheDocument()
    expect(screen.getAllByText("Doliprane").length).toBeGreaterThan(0)
    expect(screen.getByText("Smecta")).toBeInTheDocument()
    expect(screen.queryByText("Vitamine C")).not.toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Voir produit" })).toHaveLength(2)
    expect(screen.getByText("Risques d'expiration (lots)")).toBeInTheDocument()
    expect(screen.getByText("LOT-001")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Voir lot" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Prioriser la vente" })).toBeInTheDocument()
    expect(screen.getByText("Traçabilité lot et rapport de rappel")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Rechercher lot" })).toBeInTheDocument()
  })

  it("shows empty state when no product is under threshold", () => {
    mockUseInventoryItems.mockReturnValue({
      items: [
        {
          id: "product-1",
          name: "Vitamine C",
          barcode: "633333",
          stock: 12,
          threshold: 5,
          purchasePrice: 8,
          sellingPrice: 14,
          vatRate: 7,
          category: "Parapharmacie",
          dosageForm: "Comprime",
        },
      ],
      isLoading: false,
      hasOrg: true,
      adjustStock: vi.fn(),
    })

    render(<StockManagementPage />)

    expect(screen.getByText("Aucun produit n'est actuellement sous son seuil.")).toBeInTheDocument()
  })

  it("filters alerts by product name", async () => {
    const user = userEvent.setup()

    mockUseInventoryItems.mockReturnValue({
      items: [
        {
          id: "product-1",
          name: "Doliprane",
          barcode: "611111",
          stock: 0,
          threshold: 3,
          purchasePrice: 10,
          sellingPrice: 15,
          vatRate: 7,
          category: "Medicaments",
          dosageForm: "Comprime",
        },
        {
          id: "product-2",
          name: "Smecta",
          barcode: "622222",
          stock: 2,
          threshold: 4,
          purchasePrice: 12,
          sellingPrice: 18,
          vatRate: 7,
          category: "Medicaments",
          dosageForm: "Sachet",
        },
      ],
      isLoading: false,
      hasOrg: true,
      adjustStock: vi.fn(),
    })

    render(<StockManagementPage />)

    await user.type(screen.getByPlaceholderText("Rechercher un produit"), "Smecta")

    expect(screen.getByText("Smecta")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Voir produit" })).toHaveLength(1)
  })

  it("hides traceability report when role cannot view inventaire", () => {
    mockUseRoleAccess.mockReturnValue({
      canManage: () => false,
      canView: () => false,
    })
    mockUseInventoryItems.mockReturnValue({
      items: [],
      isLoading: false,
      hasOrg: true,
      adjustStock: vi.fn(),
    })

    render(<StockManagementPage />)

    expect(
      screen.getByText(
        "Vous n'avez pas les droits necessaires pour consulter la traçabilité des lots."
      )
    ).toBeInTheDocument()
  })

  it("searches a lot and renders traceability timeline", async () => {
    const user = userEvent.setup()

    mockUseInventoryItems.mockReturnValue({
      items: [],
      isLoading: false,
      hasOrg: true,
      adjustStock: vi.fn(),
    })
    mockUseLotTraceabilityReport.mockImplementation((lotNumber: string) => {
      if (lotNumber === "LOT-001") {
        return {
          lotNumber: "LOT-001",
          items: [
            {
              lotId: "lot-1",
              productId: "product-1",
              productName: "Doliprane",
              productCategory: "Medicaments",
              lotNumber: "LOT-001",
              expiryDate: Date.parse("2026-03-01"),
              currentBalance: 2,
              receivedQuantity: 5,
              soldQuantity: 3,
              supplierId: "supplier-1",
              supplierName: "Pharma Distribution",
              recallReportPath: "/app/inventaire?lotNumber=LOT-001",
              timeline: [
                {
                  id: "receive-1",
                  createdAt: 10,
                  eventType: "RECEPTION",
                  delta: 5,
                  reason: "Reception fournisseur",
                  reference: "BL-01",
                },
                {
                  id: "sale-1",
                  createdAt: 20,
                  eventType: "SORTIE",
                  delta: -3,
                  reason: "Création de vente (FEFO)",
                  reference: "sale-1",
                },
              ],
            },
          ],
          isLoading: false,
          isFetching: false,
          hasOrg: true,
        }
      }

      return {
        lotNumber: "",
        items: [],
        isLoading: false,
        isFetching: false,
        hasOrg: true,
      }
    })

    render(<StockManagementPage />)

    await user.type(screen.getByLabelText("Numero de lot"), "lot-001")
    await user.click(screen.getByRole("button", { name: "Rechercher lot" }))

    expect(screen.getByText("Doliprane · LOT-001")).toBeInTheDocument()
    expect(screen.getByText("Quantite recue")).toBeInTheDocument()
    expect(screen.getByText("Quantite vendue")).toBeInTheDocument()
    expect(screen.getByText("Solde actuel")).toBeInTheDocument()
    expect(screen.getByText("RECEPTION")).toBeInTheDocument()
    expect(screen.getByText("SORTIE")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Exporter rapport rappel" })).toBeInTheDocument()
  })
})
