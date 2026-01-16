import { AchatsPage } from "@/features/achats/achats-page"
import type { DeliveryNote, PurchaseOrder } from "@/features/achats/procurement-data"

export const metadata = {
  title: "Seraphine - Achats",
}

const purchaseOrders: PurchaseOrder[] = [
  {
    id: "BC-2401",
    supplier: "Pharma-Distrib",
    channel: "Email",
    createdAt: "2025-12-10",
    orderDate: "2025-12-12",
    total: 12500,
    status: "Commandé",
    items: [
      { id: "line-1", product: "Paracétamol 1g", quantity: 3, unitPrice: 24.5 },
      { id: "line-2", product: "Gants nitrile - Boite 100", quantity: 6, unitPrice: 86 },
    ],
  },
  {
    id: "BC-2402",
    supplier: "Med-Supply",
    channel: "Téléphone",
    createdAt: "2025-12-11",
    orderDate: "2025-12-12",
    total: 8200,
    status: "Livré",
    items: [{ id: "line-3", product: "Vitamine C 1000", quantity: 12, unitPrice: 12.8 }],
  },
  {
    id: "BC-2403",
    supplier: "Med-Supply",
    channel: "Portail",
    createdAt: "2025-12-12",
    orderDate: "2025-12-12",
    total: 6400,
    status: "Brouillon",
    items: [
      { id: "line-4", product: "Ibuprofène 400mg", quantity: 10, unitPrice: 18.2 },
      { id: "line-5", product: "Gel hydroalcoolique 500ml", quantity: 5, unitPrice: 32.4 },
    ],
  },
  {
    id: "BC-2404",
    supplier: "Sante Pro",
    channel: "Portail",
    createdAt: "2025-12-12",
    orderDate: "2025-12-12",
    total: 12500,
    status: "Commandé",
    items: [{ id: "line-6", product: "Paracétamol 1g", quantity: 30, unitPrice: 24.5 }],
  },
  {
    id: "BC-2405",
    supplier: "Pharma-Distrib",
    channel: "Téléphone",
    createdAt: "2025-12-13",
    orderDate: "2025-12-13",
    total: 9500,
    status: "Livré",
    items: [{ id: "line-7", product: "Gants nitrile - Boite 100", quantity: 20, unitPrice: 86 }],
  },
]

const deliveryNotes: DeliveryNote[] = [
  {
    id: "BL-1124",
    supplier: "Pharma-Distrib",
    channel: "Email",
    createdAt: "2025-12-12",
    orderDate: "2025-12-12",
    externalReference: "124586",
    total: 12500,
    status: "En cours",
    items: [{ id: "line-8", product: "Paracétamol 1g", quantity: 10, unitPrice: 24.5 }],
  },
  {
    id: "BL-1125",
    supplier: "Med-Supply",
    channel: "Téléphone",
    createdAt: "2025-12-12",
    orderDate: "2025-12-12",
    externalReference: "124587",
    total: 12500,
    status: "Livré",
    items: [{ id: "line-9", product: "Gants nitrile - Boite 100", quantity: 12, unitPrice: 86 }],
  },
  {
    id: "BL-1126",
    supplier: "Med-Supply",
    channel: "Portail",
    createdAt: "2025-12-12",
    orderDate: "2025-12-12",
    externalReference: "124588",
    total: 12500,
    status: "Brouillon",
    items: [{ id: "line-10", product: "Ibuprofène 400mg", quantity: 8, unitPrice: 18.2 }],
  },
  {
    id: "BL-1127",
    supplier: "Sante Pro",
    channel: "Portail",
    createdAt: "2025-12-12",
    orderDate: "2025-12-12",
    externalReference: "124589",
    total: 12500,
    status: "En cours",
    items: [{ id: "line-11", product: "Vitamine C 1000", quantity: 25, unitPrice: 12.8 }],
  },
  {
    id: "BL-1128",
    supplier: "Pharma-Distrib",
    channel: "Téléphone",
    createdAt: "2025-12-12",
    orderDate: "2025-12-12",
    externalReference: "124590",
    total: 12500,
    status: "Livré",
    items: [{ id: "line-12", product: "Paracétamol 1g", quantity: 15, unitPrice: 24.5 }],
  },
]

export default function Page() {
  return <AchatsPage purchaseOrders={purchaseOrders} deliveryNotes={deliveryNotes} />
}
