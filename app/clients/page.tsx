import { ClientsPage } from "@/components/clients-page"
import type { Client } from "@/components/clients-table"

const clientItems: Client[] = [
  {
    id: "cli-001",
    name: "Hmad",
    phone: "+212 5 22 33 44 55",
    city: "Casablanca",
    plafond: 1000,
    encours: 447,
    status: "OK",
    lastPurchase: "2025-12-12",
    notes: "Preferer paiement par virement.",
  },
  {
    id: "cli-002",
    name: "Fatima",
    phone: "+212 5 22 33 44 55",
    city: "Rabat",
    plafond: 1000,
    encours: 0,
    status: "OK",
    lastPurchase: "2025-12-12",
    notes: "Encours a zero, renouveler plafond trimestriel.",
  },
  {
    id: "cli-003",
    name: "Youssef",
    phone: "+212 5 22 33 44 55",
    city: "Casablanca",
    plafond: 1000,
    encours: 1200,
    status: "Bloqué",
    lastPurchase: "2025-12-12",
    notes: "Bloque en attente de regularisation.",
  },
  {
    id: "cli-004",
    name: "Samira",
    phone: "+212 5 22 33 44 55",
    city: "Marrakech",
    plafond: 1800,
    encours: 1750,
    status: "Surveillé",
    lastPurchase: "2025-12-12",
    notes: "Surveillance active, relance programmee.",
  },
  {
    id: "cli-005",
    name: "Omar",
    phone: "+212 5 22 33 44 55",
    city: "Agadir",
    plafond: 3000,
    encours: 600,
    status: "OK",
    lastPurchase: "2025-12-12",
    notes: "Client ponctuel avec plafond eleve.",
  },
]

export default function Page() {
  return <ClientsPage items={clientItems} />
}
