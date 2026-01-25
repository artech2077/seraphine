export type ProcurementLineItem = {
  id: string
  product: string
  quantity: number
  unitPrice: number
}

export type PurchaseOrderStatus = "Brouillon" | "Commandé" | "Livré"
export type DeliveryNoteStatus = "Brouillon" | "En cours" | "Livré"

export type PurchaseOrder = {
  id: string
  orderNumber: string
  supplier: string
  channel: string
  createdAt: string
  orderDate: string
  total: number
  status: PurchaseOrderStatus
  items: ProcurementLineItem[]
}

export type DeliveryNote = {
  id: string
  orderNumber: string
  supplier: string
  channel: string
  createdAt: string
  orderDate: string
  externalReference: string
  total: number
  status: DeliveryNoteStatus
  items: ProcurementLineItem[]
}

export type ProductOption = {
  id: string
  name: string
  unitPrice: number
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
  { id: "prod-001", name: "Paracétamol 1g", unitPrice: 24.5 },
  { id: "prod-002", name: "Gants nitrile - Boite 100", unitPrice: 86 },
  { id: "prod-003", name: "Ibuprofène 400mg", unitPrice: 18.2 },
  { id: "prod-004", name: "Vitamine C 1000", unitPrice: 12.8 },
  { id: "prod-005", name: "Gel hydroalcoolique 500ml", unitPrice: 32.4 },
]
