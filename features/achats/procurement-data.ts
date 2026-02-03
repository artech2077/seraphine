export type ProcurementLineItem = {
  id: string
  productId?: string
  product: string
  quantity: number
  unitPrice: number
  lineDiscountType?: "percent" | "amount"
  lineDiscountValue?: number
}

export type PurchaseOrderStatus = "Brouillon" | "Commandé" | "Livré"
export type DeliveryNoteStatus = "Brouillon" | "En cours" | "Livré"

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
  barcode: string
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

export const PURCHASE_STATUS_OPTIONS: PurchaseOrderStatus[] = ["Brouillon", "Commandé", "Livré"]

export const DELIVERY_STATUS_OPTIONS: DeliveryNoteStatus[] = ["Brouillon", "En cours", "Livré"]

export const PRODUCT_OPTIONS: ProductOption[] = [
  { id: "prod-001", name: "Paracétamol 1g", unitPrice: 24.5, barcode: "100001" },
  { id: "prod-002", name: "Gants nitrile - Boite 100", unitPrice: 86, barcode: "100002" },
  { id: "prod-003", name: "Ibuprofène 400mg", unitPrice: 18.2, barcode: "100003" },
  { id: "prod-004", name: "Vitamine C 1000", unitPrice: 12.8, barcode: "100004" },
  { id: "prod-005", name: "Gel hydroalcoolique 500ml", unitPrice: 32.4, barcode: "100005" },
]
