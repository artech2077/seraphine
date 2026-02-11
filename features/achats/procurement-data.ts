export type ProcurementLotItem = {
  lotNumber: string
  expiryDate: string
  quantity: number
}

export type ProcurementLineItem = {
  id: string
  productId?: string
  product: string
  quantity: number
  unitPrice: number
  lineDiscountType?: "percent" | "amount"
  lineDiscountValue?: number
  lots?: ProcurementLotItem[]
}

export type PurchaseOrderStatus = "Brouillon" | "Commandé"
export type DeliveryNoteStatus = "Brouillon" | "Commandé" | "En cours" | "Livré"

export type PurchaseOrder = {
  id: string
  orderNumber: string
  supplierId?: string
  supplier: string
  channel: string
  createdAt: string
  orderDate: string
  dueDate?: string
  total: number
  status: PurchaseOrderStatus
  globalDiscountType?: "percent" | "amount"
  globalDiscountValue?: number
  items: ProcurementLineItem[]
}

export type DeliveryNote = {
  id: string
  orderNumber: string
  supplierId?: string
  supplier: string
  channel: string
  createdAt: string
  orderDate: string
  dueDate?: string
  externalReference: string
  total: number
  status: DeliveryNoteStatus
  globalDiscountType?: "percent" | "amount"
  globalDiscountValue?: number
  items: ProcurementLineItem[]
}

export type ProductOption = {
  id: string
  name: string
  unitPrice: number
  sellingPrice: number
  vatRate: number
  barcode: string
  category: string
  stockQuantity: number
  lowStockThreshold: number
}

export const SUPPLIER_OPTIONS = [
  "Sanofi",
  "UPSA",
  "Teva Sante",
  "J&J",
  "Reckitt",
  "Pharma-Distrib",
  "Med-Supply",
  "Sante Pro",
]

export const CHANNEL_OPTIONS = ["Email", "Téléphone", "Portail"]

export const PURCHASE_STATUS_OPTIONS: PurchaseOrderStatus[] = ["Brouillon", "Commandé"]

export const DELIVERY_STATUS_OPTIONS: DeliveryNoteStatus[] = [
  "Brouillon",
  "Commandé",
  "En cours",
  "Livré",
]

export const PRODUCT_OPTIONS: ProductOption[] = [
  {
    id: "prod-001",
    name: "Paracétamol 1g",
    unitPrice: 24.5,
    sellingPrice: 32.9,
    vatRate: 7,
    barcode: "100001",
    category: "Médicaments",
    stockQuantity: 42,
    lowStockThreshold: 8,
  },
  {
    id: "prod-002",
    name: "Gants nitrile - Boite 100",
    unitPrice: 86,
    sellingPrice: 119,
    vatRate: 20,
    barcode: "100002",
    category: "Consommables",
    stockQuantity: 25,
    lowStockThreshold: 10,
  },
  {
    id: "prod-003",
    name: "Ibuprofène 400mg",
    unitPrice: 18.2,
    sellingPrice: 24.8,
    vatRate: 7,
    barcode: "100003",
    category: "Médicaments",
    stockQuantity: 12,
    lowStockThreshold: 12,
  },
  {
    id: "prod-004",
    name: "Vitamine C 1000",
    unitPrice: 12.8,
    sellingPrice: 17.2,
    vatRate: 7,
    barcode: "100004",
    category: "Parapharmacie",
    stockQuantity: 0,
    lowStockThreshold: 6,
  },
  {
    id: "prod-005",
    name: "Gel hydroalcoolique 500ml",
    unitPrice: 32.4,
    sellingPrice: 45,
    vatRate: 20,
    barcode: "100005",
    category: "Parapharmacie",
    stockQuantity: 6,
    lowStockThreshold: 8,
  },
]
