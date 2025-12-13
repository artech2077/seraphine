export type Client = {
  id: string
  name: string
  phone: string
  city: string
  creditLimit: number
  balance: number
  lastPurchase: string
  status: "ok" | "risk" | "blocked"
  notes?: string
}

export const mockClients: Client[] = [
  {
    id: "cli-1",
    name: "client 1",
    phone: "",
    city: "Casablanca",
    creditLimit: 1000,
    balance: 447,
    lastPurchase: "08/11/2025",
    status: "ok",
    notes: "Client comptoir, paiement en caisse.",
  },
  {
    id: "cli-2",
    name: "Hmad",
    phone: "",
    city: "Casablanca",
    creditLimit: 500,
    balance: 0,
    lastPurchase: "08/11/2025",
    status: "ok",
    notes: "Paiement au comptant, aucun encours actif.",
  },
  {
    id: "cli-3",
    name: "Fatima Zahra",
    phone: "+212 6 61 22 33 44",
    city: "Rabat",
    creditLimit: 2500,
    balance: 1200,
    lastPurchase: "04/04/2024",
    status: "risk",
    notes: "Encours en cours de régularisation, relance hebdomadaire.",
  },
  {
    id: "cli-4",
    name: "Youssef Tazi",
    phone: "+212 6 63 55 66 77",
    city: "Marrakech",
    creditLimit: 1800,
    balance: 1750,
    lastPurchase: "12/04/2024",
    status: "blocked",
    notes: "Plafond atteint, bloquer les nouveaux crédits avant règlement.",
  },
  {
    id: "cli-5",
    name: "Samira Bennani",
    phone: "+212 6 67 88 99 00",
    city: "Agadir",
    creditLimit: 3000,
    balance: 600,
    lastPurchase: "14/04/2024",
    status: "ok",
    notes: "Réglé partiellement, proposer révision de plafond à 4 000 MAD.",
  },
]
