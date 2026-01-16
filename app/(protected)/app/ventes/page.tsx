import { type SaleHistoryItem } from "@/features/ventes/sales-history-table"
import { VentesPage } from "@/features/ventes/ventes-page"

export const metadata = {
  title: "Seraphine - Ventes",
}

const salesHistory: SaleHistoryItem[] = [
  {
    id: "VT-2407-001",
    date: "08 Jan 2026",
    client: "Clinique Atlas",
    seller: "Nadia H.",
    paymentMethod: "Espèce",
    globalDiscount: "-",
    amountTtc: 428.5,
    items: [
      {
        id: "line-001",
        product: "Paracetamol 500mg",
        quantity: 12,
        unitPriceHt: 12.5,
        vatRate: 7,
        discount: "-",
        totalTtc: 160.5,
      },
      {
        id: "line-002",
        product: "Vitamine C 1000",
        quantity: 8,
        unitPriceHt: 6.8,
        vatRate: 0,
        discount: "5%",
        totalTtc: 54.4,
      },
    ],
  },
  {
    id: "VT-2407-002",
    date: "09 Jan 2026",
    client: "Pharmacie du Centre",
    seller: "Imane B.",
    paymentMethod: "Carte",
    globalDiscount: "5%",
    amountTtc: 892.2,
    items: [
      {
        id: "line-003",
        product: "Ibuprofene 400mg",
        quantity: 20,
        unitPriceHt: 9.2,
        vatRate: 7,
        discount: "10%",
        totalTtc: 196.4,
      },
      {
        id: "line-004",
        product: "Gel hydroalcoolique 250ml",
        quantity: 15,
        unitPriceHt: 7.6,
        vatRate: 19,
        discount: "-",
        totalTtc: 226.1,
      },
      {
        id: "line-005",
        product: "Gaze sterile 10x10",
        quantity: 30,
        unitPriceHt: 2.4,
        vatRate: 7,
        discount: "-",
        totalTtc: 92.4,
      },
    ],
  },
  {
    id: "VT-2407-003",
    date: "10 Jan 2026",
    client: "Dr. Rania L.",
    seller: "Youssef A.",
    paymentMethod: "Crédit",
    globalDiscount: "50 MAD",
    amountTtc: 615.0,
    items: [
      {
        id: "line-006",
        product: "Serum physiologique 500ml",
        quantity: 10,
        unitPriceHt: 8.9,
        vatRate: 7,
        discount: "-",
        totalTtc: 95.2,
      },
      {
        id: "line-007",
        product: "Bandes elastiques",
        quantity: 6,
        unitPriceHt: 6.2,
        vatRate: 7,
        discount: "-",
        totalTtc: 39.8,
      },
    ],
  },
]

export default function Page() {
  return <VentesPage salesHistory={salesHistory} />
}
