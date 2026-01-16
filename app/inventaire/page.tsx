import { InventoryPage } from "@/components/inventory-page"
import type { InventoryItem } from "@/components/inventory-table"

export const metadata = {
  title: "Seraphine - Inventaire",
}

const inventoryItems: InventoryItem[] = [
  {
    id: "prod-001",
    name: "Doliprane",
    barcode: "3665585002447",
    supplier: "Sanofi",
    stock: 8,
    threshold: 10,
    purchasePrice: 15,
    sellingPrice: 20,
    vatRate: 20,
    category: "Antalgique",
    dosageForm: "Comprime",
  },
  {
    id: "prod-002",
    name: "Aspirine",
    barcode: "3665585002447",
    supplier: "UPSA",
    stock: 52,
    threshold: 20,
    purchasePrice: 12.5,
    sellingPrice: 18,
    vatRate: 20,
    category: "Antalgique",
    dosageForm: "Effervescent",
  },
  {
    id: "prod-003",
    name: "Spasfon",
    barcode: "3665585002447",
    supplier: "Teva Sante",
    stock: 12,
    threshold: 10,
    purchasePrice: 25,
    sellingPrice: 35,
    vatRate: 20,
    category: "Antispasmodique",
    dosageForm: "Lyophilisat oral",
  },
  {
    id: "prod-004",
    name: "Imodium",
    barcode: "3665585002447",
    supplier: "J&J",
    stock: 30,
    threshold: 15,
    purchasePrice: 30,
    sellingPrice: 42,
    vatRate: 20,
    category: "Antidiarrheique",
    dosageForm: "Gelule",
  },
  {
    id: "prod-005",
    name: "Gaviscon",
    barcode: "3665585002447",
    supplier: "Reckitt",
    stock: 75,
    threshold: 30,
    purchasePrice: 40,
    sellingPrice: 55,
    vatRate: 20,
    category: "Antiacide",
    dosageForm: "Suspension buvable",
  },
]

export default function Page() {
  return <InventoryPage items={inventoryItems} />
}
