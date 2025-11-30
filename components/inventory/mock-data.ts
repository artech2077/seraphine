export type InventoryProduct = {
  id: string
  name: string
  stock: number
  threshold: number
  purchasePrice: number
  salePrice: number
  tva: number
  category: string
  supplier: string
  galenicForm: string
  barcode: string
}

export const mockInventory: InventoryProduct[] = [
  {
    id: "doliprane-1000",
    name: "Doliprane 1000mg",
    stock: 8,
    threshold: 10,
    purchasePrice: 15,
    salePrice: 20,
    tva: 20,
    category: "Antalgique",
    supplier: "Sanofi",
    galenicForm: "Comprimé",
    barcode: "3665585002447",
  },
  {
    id: "aspirine-upsa-500",
    name: "Aspirine UPSA 500mg",
    stock: 52,
    threshold: 20,
    purchasePrice: 12.5,
    salePrice: 18,
    tva: 20,
    category: "Antalgique",
    supplier: "UPSA",
    galenicForm: "Comprimé effervescent",
    barcode: "3400934892468",
  },
  {
    id: "spasfon-lyoc-80",
    name: "Spasfon Lyoc 80mg",
    stock: 12,
    threshold: 10,
    purchasePrice: 25,
    salePrice: 35,
    tva: 20,
    category: "Antispasmodique",
    supplier: "Teva Santé",
    galenicForm: "Lyophilisat oral",
    barcode: "3400932598579",
  },
  {
    id: "imodium-2",
    name: "Imodium 2mg",
    stock: 30,
    threshold: 15,
    purchasePrice: 30,
    salePrice: 42,
    tva: 20,
    category: "Antidiarrhéique",
    supplier: "J&J",
    galenicForm: "Gélule",
    barcode: "3574660410657",
  },
  {
    id: "gavisconell-sachet",
    name: "Gavisconell Sachet",
    stock: 75,
    threshold: 30,
    purchasePrice: 40,
    salePrice: 55,
    tva: 20,
    category: "Antacide",
    supplier: "Reckitt",
    galenicForm: "Suspension buvable",
    barcode: "3400936086780",
  },
]
