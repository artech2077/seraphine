import { SuppliersPage } from "@/features/fournisseurs/suppliers-page"
import type { Supplier } from "@/features/fournisseurs/suppliers-table"

export const metadata = {
  title: "Seraphine - Fournisseurs",
}

const supplierItems: Supplier[] = [
  {
    id: "sup-001",
    name: "LaboMaroc",
    email: "contact@labomaroc.com",
    phone: "+212 5 22 33 44 55",
    city: "Casablanca",
    balance: -12500,
    notes: "Livraison 48h, paiement fin de mois.",
  },
  {
    id: "sup-002",
    name: "PharmaDistrib",
    email: "contact@pharmadistrib.com",
    phone: "+212 5 22 33 44 55",
    city: "Rabat",
    balance: 0,
    notes: "Contacts logistiques a valider.",
  },
  {
    id: "sup-003",
    name: "MediSupply",
    email: "contact@medisupply.com",
    phone: "+212 5 22 33 44 55",
    city: "Agadir",
    balance: -5800.5,
    notes: "Relance email pour remise volume.",
  },
  {
    id: "sup-004",
    name: "SantePlus",
    email: "contact@santeplus.com",
    phone: "+212 5 22 33 44 55",
    city: "Marrakech",
    balance: 5000,
    notes: "Conditions 30 jours fin de mois.",
  },
  {
    id: "sup-005",
    name: "Cooper Pharma",
    email: "contact@cooperpharma.com",
    phone: "+212 5 22 33 44 55",
    city: "Casablanca",
    balance: -21340,
    notes: "Contrat cadre en discussion.",
  },
]

export default function Page() {
  return <SuppliersPage items={supplierItems} />
}
