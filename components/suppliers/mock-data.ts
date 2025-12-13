export type DeliveryNote = {
  id: string
  date: string
  reference: string
  amount: number
  status: "pending" | "delivered"
}

export type PurchaseOrder = {
  id: string
  date: string
  channel: string
  amount: number
  status: "draft" | "confirmed" | "delivered"
}

export type Payment = {
  id: string
  date: string
  amount: number
  method: string
}

export type Supplier = {
  id: string
  name: string
  email: string
  phone: string
  city: string
  balance: number
  deliveries: DeliveryNote[]
  purchaseOrders: PurchaseOrder[]
  payments: Payment[]
  notes?: string
}

export const mockSuppliers: Supplier[] = [
  {
    id: "sup-1",
    name: "LaboMaroc",
    email: "contact@labomaroc.ma",
    phone: "+212 5 22 33 44 55",
    city: "Casablanca",
    balance: -12500,
    deliveries: [
      { id: "BL-0401", date: "04/04/2024", reference: "REF-2210", amount: 6200, status: "delivered" },
      { id: "BL-0407", date: "12/04/2024", reference: "REF-2230", amount: 7600, status: "pending" },
    ],
    purchaseOrders: [
      { id: "BC-0102", date: "02/04/2024", channel: "Email", amount: 12500, status: "confirmed" },
      { id: "BC-0106", date: "10/04/2024", channel: "Portail", amount: 9400, status: "draft" },
    ],
    payments: [
      { id: "PAY-701", date: "05/04/2024", amount: 4200, method: "Virement" },
      { id: "PAY-716", date: "18/04/2024", amount: 3100, method: "Effet" },
    ],
    notes: "Livraison hebdomadaire, conditions 45j fin de mois.",
  },
  {
    id: "sup-2",
    name: "PharmaDistri",
    email: "sales@pharmadistri.com",
    phone: "+212 5 37 88 99 00",
    city: "Rabat",
    balance: 0,
    deliveries: [
      { id: "BL-0410", date: "08/04/2024", reference: "REF-2240", amount: 11500, status: "delivered" },
      { id: "BL-0414", date: "15/04/2024", reference: "REF-2248", amount: 8800, status: "delivered" },
    ],
    purchaseOrders: [
      { id: "BC-0110", date: "07/04/2024", channel: "Téléphone", amount: 8800, status: "confirmed" },
      { id: "BC-0114", date: "14/04/2024", channel: "Email", amount: 11500, status: "delivered" },
    ],
    payments: [
      { id: "PAY-722", date: "09/04/2024", amount: 8800, method: "Virement" },
      { id: "PAY-733", date: "18/04/2024", amount: 11500, method: "Virement" },
    ],
  },
  {
    id: "sup-3",
    name: "MediSupply",
    email: "info@medisupply.net",
    phone: "+212 5 28 11 22 33",
    city: "Agadir",
    balance: -5800.5,
    deliveries: [
      { id: "BL-0421", date: "03/04/2024", reference: "REF-2251", amount: 4300, status: "pending" },
      { id: "BL-0424", date: "11/04/2024", reference: "REF-2258", amount: 6500.5, status: "delivered" },
    ],
    purchaseOrders: [
      { id: "BC-0122", date: "02/04/2024", channel: "Portail", amount: 5800.5, status: "confirmed" },
      { id: "BC-0125", date: "12/04/2024", channel: "Email", amount: 7400, status: "draft" },
    ],
    payments: [
      { id: "PAY-741", date: "13/04/2024", amount: 1600, method: "Virement" },
      { id: "PAY-752", date: "19/04/2024", amount: 2100, method: "Espèces" },
    ],
    notes: "Privilégier les commandes avant mardi pour expédition dans la semaine.",
  },
  {
    id: "sup-4",
    name: "SantePlus",
    email: "achats@santeplus.ma",
    phone: "+212 5 24 55 66 77",
    city: "Marrakech",
    balance: 0,
    deliveries: [
      { id: "BL-0430", date: "05/04/2024", reference: "REF-2268", amount: 9300, status: "delivered" },
      { id: "BL-0435", date: "13/04/2024", reference: "REF-2271", amount: 7200, status: "delivered" },
    ],
    purchaseOrders: [
      { id: "BC-0130", date: "04/04/2024", channel: "Téléphone", amount: 7200, status: "confirmed" },
      { id: "BC-0136", date: "12/04/2024", channel: "Email", amount: 9300, status: "delivered" },
    ],
    payments: [
      { id: "PAY-762", date: "06/04/2024", amount: 7200, method: "Effet" },
      { id: "PAY-770", date: "16/04/2024", amount: 9300, method: "Virement" },
    ],
  },
  {
    id: "sup-5",
    name: "Cooper Pharma",
    email: "contact@cooperpharma.ma",
    phone: "+212 5 22 99 88 77",
    city: "Casablanca",
    balance: -21340,
    deliveries: [
      { id: "BL-0442", date: "02/04/2024", reference: "REF-2280", amount: 11000, status: "pending" },
      { id: "BL-0447", date: "10/04/2024", reference: "REF-2284", amount: 12400, status: "delivered" },
    ],
    purchaseOrders: [
      { id: "BC-0140", date: "01/04/2024", channel: "Portail", amount: 21340, status: "confirmed" },
      { id: "BC-0144", date: "14/04/2024", channel: "Email", amount: 9800, status: "draft" },
    ],
    payments: [
      { id: "PAY-781", date: "08/04/2024", amount: 6400, method: "Chèque" },
      { id: "PAY-794", date: "18/04/2024", amount: 5400, method: "Virement" },
    ],
    notes: "Solvabilité correcte, suivre les relances sur les échéances en cours.",
  },
]
