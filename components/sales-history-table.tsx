 "use client"

import { Fragment, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Columns3,
  Download,
  MoreVertical,
  Printer,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Sale = {
  id: string
  date: string
  client: string
  seller: string
  products: number
  remise: string
  total: string
  paiement: string
  items: {
    name: string
    unitPrice: string
    qty: string
    tva: string
    lineTotal: string
  }[]
}

const sales: Sale[] = [
  {
    id: "S001",
    date: "15/07/2024",
    client: "Client Comptant",
    seller: "Alain V.",
    products: 2,
    remise: "50,00",
    total: "250,00",
    paiement: "Carte",
    items: [
      {
        name: "Produit A - Description courte",
        unitPrice: "150,00",
        qty: "1",
        tva: "30,00 (20%)",
        lineTotal: "180,00",
      },
      {
        name: "Produit B - Description courte",
        unitPrice: "100,00",
        qty: "1",
        tva: "20,00 (20%)",
        lineTotal: "120,00",
      },
    ],
  },
  {
    id: "S002",
    date: "15/07/2024",
    client: "Jean Dupont",
    seller: "Alain V.",
    products: 1,
    remise: "0,00",
    total: "1 200,50",
    paiement: "Espèces",
    items: [
      {
        name: "Produit C - Description",
        unitPrice: "1 200,50",
        qty: "1",
        tva: "0,00",
        lineTotal: "1 200,50",
      },
    ],
  },
  {
    id: "S003",
    date: "14/07/2024",
    client: "Société ABC",
    seller: "Sophie L.",
    products: 5,
    remise: "150,00",
    total: "5 600,00",
    paiement: "Crédit",
    items: [
      {
        name: "Produit D - Description",
        unitPrice: "1 120,00",
        qty: "5",
        tva: "150,00",
        lineTotal: "5 600,00",
      },
    ],
  },
]

export default function SalesHistoryTable() {
  const [expandedSale, setExpandedSale] = useState<string | null>("S001")

  const toggleSale = (id: string) => {
    setExpandedSale((prev) => (prev === id ? null : id))
  }

  return (
    <Card className="border border-border bg-card rounded-xl shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
            HISTORIQUE DES VENTES
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            Consultez les ventes passées
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par client ou ID…"
              className="h-11 rounded-full bg-input border border-input pl-10 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Select>
            <SelectTrigger className="h-11 rounded-full bg-input border border-input px-4 text-sm">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7j">7 derniers jours</SelectItem>
              <SelectItem value="30j">30 derniers jours</SelectItem>
              <SelectItem value="90j">90 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="h-11 rounded-full bg-input border border-input px-4 text-sm">
              <SelectValue placeholder="Produits" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="top">Top ventes</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="h-11 rounded-full bg-input border border-input px-4 text-sm">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="cash">Espèces</SelectItem>
              <SelectItem value="card">Carte</SelectItem>
              <SelectItem value="credit">Crédit</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-11 rounded-full border border-input bg-input px-4 text-sm text-foreground"
          >
            <Columns3 className="h-4 w-4 mr-2" />
            Colonnes
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow className="border-border">
              <TableHead className="w-12" />
              <TableHead className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                ID VENTE
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                DATE
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                CLIENT
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                VENDEUR
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                PRODUITS
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                REMISE
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                MONTANT TOTAL
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                PAIEMENT
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => {
              const isOpen = expandedSale === sale.id
              return (
                <Fragment key={sale.id}>
                  <TableRow className="border-border">
                    <TableCell className="w-12">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => toggleSale(sale.id)}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">#{sale.id}</TableCell>
                    <TableCell className="text-foreground">{sale.date}</TableCell>
                    <TableCell className="text-foreground">{sale.client}</TableCell>
                    <TableCell className="text-foreground">{sale.seller}</TableCell>
                    <TableCell className="text-foreground">{sale.products}</TableCell>
                    <TableCell className="text-foreground">{sale.remise}</TableCell>
                    <TableCell className="font-semibold text-foreground">{sale.total}</TableCell>
                    <TableCell className="text-foreground">{sale.paiement}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <Fragment>
                      <TableRow className="bg-muted/40 border-border">
                        <TableCell />
                        <TableCell className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Produit
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Prix unitaire
                        </TableCell>
                        <TableCell className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Quantité
                        </TableCell>
                        <TableCell className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          TVA
                        </TableCell>
                        <TableCell className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Total
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                      {sale.items.map((item, idx) => (
                        <TableRow key={`${sale.id}-item-${idx}`} className="bg-muted/40 border-border">
                          <TableCell />
                          <TableCell colSpan={3} className="text-foreground">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-foreground">{item.unitPrice}</TableCell>
                          <TableCell className="text-foreground">{item.qty}</TableCell>
                          <TableCell className="text-foreground">{item.tva}</TableCell>
                          <TableCell className="text-foreground font-semibold">{item.lineTotal}</TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      ))}
                    </Fragment>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>1–10 sur 53 résultats</div>
        <div className="flex items-center gap-3">
          <span>Lignes par page</span>
          <Select defaultValue="10">
            <SelectTrigger className="h-9 w-[80px] rounded-md bg-input border border-input px-3 text-sm">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4 -rotate-180" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
