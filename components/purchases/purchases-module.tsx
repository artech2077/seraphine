"use client"

import { type Dispatch, type SetStateAction, useMemo, useState } from "react"
import Link from "next/link"
import {
  Download,
  FileText,
  MoreHorizontal,
  Plus,
  Printer,
  Trash2,
  Truck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

type PurchaseOrder = {
  id: string
  supplier: string
  channel: string
  createdAt: string
  orderDate: string
  total: number
  status: "confirmed" | "draft" | "delivered"
}

type DeliveryNote = {
  id: string
  supplier: string
  createdAt: string
  deliveryDate: string
  reference: string
  total: number
  status: "pending" | "draft" | "delivered"
}

type LineItem = {
  id: string
  name: string
  quantity: number
  price: number
}

const purchaseOrders: PurchaseOrder[] = [
  {
    id: "#BC-00124",
    supplier: "Pharma-Distrib",
    channel: "Email",
    createdAt: "12/07/2024",
    orderDate: "12/07/2024",
    total: 12500,
    status: "confirmed",
  },
  {
    id: "#BC-00123",
    supplier: "Med-Supply",
    channel: "Téléphone",
    createdAt: "11/07/2024",
    orderDate: "11/07/2024",
    total: 8230.5,
    status: "draft",
  },
  {
    id: "#BC-00122",
    supplier: "Sante-Pro",
    channel: "Portail",
    createdAt: "10/07/2024",
    orderDate: "10/07/2024",
    total: 25150,
    status: "delivered",
  },
]

const deliveryNotes: DeliveryNote[] = [
  {
    id: "#BL-00410",
    supplier: "Pharma-Distrib",
    createdAt: "12/07/2024",
    deliveryDate: "13/07/2024",
    reference: "REF-1240",
    total: 11890,
    status: "delivered",
  },
  {
    id: "#BL-00409",
    supplier: "Med-Supply",
    createdAt: "11/07/2024",
    deliveryDate: "12/07/2024",
    reference: "REF-1239",
    total: 6750,
    status: "pending",
  },
  {
    id: "#BL-00408",
    supplier: "Sante-Pro",
    createdAt: "10/07/2024",
    deliveryDate: "10/07/2024",
    reference: "REF-1238",
    total: 21990,
    status: "draft",
  },
]

const suppliers = ["Pharma-Distrib", "Med-Supply", "Sante-Pro", "LogiMed"]

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
  minimumFractionDigits: 2,
})

const statusStyles = {
  confirmed: {
    label: "Confirmé",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  draft: {
    label: "Brouillon",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  delivered: {
    label: "Livré",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  pending: {
    label: "En cours",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
} as const

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function PurchasesModule() {
  const [tab, setTab] = useState<"orders" | "deliveries">("orders")
  const [activeSheet, setActiveSheet] = useState<"po" | "dn" | null>(null)
  const [poStatus, setPoStatus] = useState<"draft" | "confirmed">("confirmed")
  const [dnStatus, setDnStatus] = useState<"draft" | "delivered">("draft")
  const [poItems, setPoItems] = useState<LineItem[]>([
    { id: "po-1", name: "Paracétamol 1g", quantity: 3, price: 24.5 },
    { id: "po-2", name: "Gants nitrile - Boîte 100", quantity: 6, price: 86 },
  ])
  const [dnItems, setDnItems] = useState<LineItem[]>([
    { id: "dn-1", name: "Seringues 2ml", quantity: 4, price: 32 },
    { id: "dn-2", name: "Solution hydroalcoolique 500ml", quantity: 10, price: 19.9 },
  ])

  const poTotal = useMemo(() => calculateTotal(poItems), [poItems])
  const dnTotal = useMemo(() => calculateTotal(dnItems), [dnItems])

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Achats
        </p>
        <h2 className="text-2xl font-semibold text-foreground">Bons de commande et de livraison</h2>
        <p className="text-muted-foreground">
          Données fictives pour valider l’UI Achats : création, actions et suivi des statuts.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as "orders" | "deliveries")} className="w-full">
        <TabsList className="h-auto w-fit gap-1 rounded-none border-b border-border bg-transparent px-0 pb-1">
          <TabsTrigger
            value="orders"
            className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Bons de Commande
          </TabsTrigger>
          <TabsTrigger
            value="deliveries"
            className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Bons de Livraison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="pt-2">
          <PurchaseOrdersSection onCreate={() => setActiveSheet("po")} />
        </TabsContent>
        <TabsContent value="deliveries" className="pt-2">
          <DeliveryNotesSection onCreate={() => setActiveSheet("dn")} />
        </TabsContent>
      </Tabs>

      <DocumentSheet
        kind="po"
        open={activeSheet === "po"}
        onOpenChange={(open) => setActiveSheet(open ? "po" : null)}
        status={poStatus}
        onStatusChange={(value) => value && setPoStatus(value as "draft" | "confirmed")}
        items={poItems}
        onItemsChange={setPoItems}
        total={poTotal}
      />

      <DocumentSheet
        kind="dn"
        open={activeSheet === "dn"}
        onOpenChange={(open) => setActiveSheet(open ? "dn" : null)}
        status={dnStatus}
        onStatusChange={(value) => value && setDnStatus(value as "draft" | "delivered")}
        items={dnItems}
        onItemsChange={setDnItems}
        total={dnTotal}
      />
    </div>
  )
}

function PurchaseOrdersSection({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="overflow-hidden border border-border shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b border-border bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">Bons de Commande</CardTitle>
          <CardDescription>Suivi des bons confirmés, brouillons ou livrés.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="text-muted-foreground" aria-label="Imprimer">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="text-muted-foreground" aria-label="Exporter">
            <Download className="h-4 w-4" />
          </Button>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Créer un bon de commande
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="w-[160px] uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  ID commande
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Fournisseur
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Canal
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Date de création
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Date du bon
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Total
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Statut
                </TableHead>
                <TableHead className="text-right uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((order) => (
                <TableRow key={order.id} className="border-border">
                  <TableCell className="font-semibold text-primary">
                    <Link href="#" className="hover:underline">
                      {order.id}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{order.supplier}</TableCell>
                  <TableCell className="text-muted-foreground">{order.channel}</TableCell>
                  <TableCell className="text-muted-foreground">{order.createdAt}</TableCell>
                  <TableCell className="text-muted-foreground">{order.orderDate}</TableCell>
                  <TableCell className="font-semibold text-foreground">{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function DeliveryNotesSection({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="overflow-hidden border border-border shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b border-border bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">Bons de Livraison</CardTitle>
          <CardDescription>Réceptions fournisseurs, brouillons et livraisons confirmées.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="text-muted-foreground" aria-label="Imprimer">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="text-muted-foreground" aria-label="Exporter">
            <Download className="h-4 w-4" />
          </Button>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Créer un bon de livraison
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="w-[160px] uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  ID livraison
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Fournisseur
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Date de création
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Date du bon
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Réf livraison
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Total
                </TableHead>
                <TableHead className="uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Statut
                </TableHead>
                <TableHead className="text-right uppercase tracking-wide text-xs font-semibold text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryNotes.map((note) => (
                <TableRow key={note.id} className="border-border">
                  <TableCell className="font-semibold text-primary">
                    <Link href="#" className="hover:underline">
                      {note.id}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{note.supplier}</TableCell>
                  <TableCell className="text-muted-foreground">{note.createdAt}</TableCell>
                  <TableCell className="text-muted-foreground">{note.deliveryDate}</TableCell>
                  <TableCell className="text-muted-foreground">{note.reference}</TableCell>
                  <TableCell className="font-semibold text-foreground">{formatCurrency(note.total)}</TableCell>
                  <TableCell>
                    <StatusBadge status={note.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function DocumentSheet({
  kind,
  open,
  onOpenChange,
  status,
  onStatusChange,
  items,
  onItemsChange,
  total,
}: {
  kind: "po" | "dn"
  open: boolean
  onOpenChange: (open: boolean) => void
  status: "draft" | "confirmed" | "delivered"
  onStatusChange: (value: "draft" | "confirmed" | "delivered" | undefined) => void
  items: LineItem[]
  onItemsChange: Dispatch<SetStateAction<LineItem[]>>
  total: number
}) {
  const isPurchaseOrder = kind === "po"

  const statusOptions = isPurchaseOrder
    ? [
        { value: "draft", label: "Brouillon" },
        { value: "confirmed", label: "Confirmé" },
      ]
    : [
        { value: "draft", label: "Brouillon" },
        { value: "delivered", label: "Confirmé" },
      ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[720px] border-l border-border bg-background p-0 sm:max-w-3xl">
        <SheetHeader className="px-6 pb-2 pt-6">
          <SheetTitle>
            {isPurchaseOrder ? "Créer un bon de commande" : "Créer un bon de livraison"}
          </SheetTitle>
          <SheetDescription>
            Simulez la création en ajoutant plusieurs articles et un statut {isPurchaseOrder ? "commande" : "livraison"}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-6 pb-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Select defaultValue={suppliers[0]}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Choisir un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isPurchaseOrder ? "Canal" : "Référence livraison"}</Label>
              {isPurchaseOrder ? (
                <Select defaultValue="email">
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="telephone">Téléphone</SelectItem>
                    <SelectItem value="portal">Portail</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input defaultValue="REF-1241" />
              )}
            </div>

            <div className="space-y-2">
              <Label>{isPurchaseOrder ? "Date du bon de commande" : "Date du bon de livraison"}</Label>
              <Input type="date" defaultValue="2024-07-13" />
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <ToggleGroup
                type="single"
                value={status}
                onValueChange={onStatusChange}
                className="rounded-md border border-border bg-muted/40 p-1"
              >
                {statusOptions.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="flex-1 rounded-md text-sm font-medium data-[state=on]:bg-background data-[state=on]:text-foreground"
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Articles</div>
                <p className="text-xs text-muted-foreground">Ajoutez plusieurs lignes pour simuler la commande.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => addItem(onItemsChange, items)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une ligne
              </Button>
            </div>

            <div className="divide-y divide-border">
              {items.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  Aucun article. Commencez par ajouter une ligne.
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1.4fr_0.5fr_0.7fr_auto] items-center gap-3 px-4 py-3"
                  >
                    <Input
                      value={item.name}
                      onChange={(event) => updateItem(onItemsChange, items, item.id, "name", event.target.value)}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(onItemsChange, items, item.id, "quantity", Number(event.target.value))
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.price}
                      onChange={(event) =>
                        updateItem(onItemsChange, items, item.id, "price", Number(event.target.value))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={() => removeItem(onItemsChange, items, item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-border px-6 py-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Total estimé</span>
              <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline">Enregistrer en brouillon</Button>
              <Button>
                {isPurchaseOrder ? "Créer le bon de commande" : "Créer le bon de livraison"}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function StatusBadge({
  status,
}: {
  status: keyof typeof statusStyles
}) {
  const style = statusStyles[status]

  return (
    <Badge variant="outline" className={cn("rounded-full px-3 py-1 font-semibold", style.className)}>
      {style.label}
    </Badge>
  )
}

function RowActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem>
          <FileText className="mr-2 h-4 w-4" />
          Ouvrir
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Printer className="mr-2 h-4 w-4" />
          Imprimer
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Download className="mr-2 h-4 w-4" />
          Exporter (PDF)
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Truck className="mr-2 h-4 w-4" />
          Marquer comme livré
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function addItem(setItems: Dispatch<SetStateAction<LineItem[]>>, items: LineItem[]) {
  const newItem: LineItem = {
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    name: "Nouvel article",
    quantity: 1,
    price: 0,
  }
  setItems([...items, newItem])
}

function removeItem(setItems: Dispatch<SetStateAction<LineItem[]>>, items: LineItem[], id: string) {
  setItems(items.filter((item) => item.id !== id))
}

function updateItem(
  setItems: Dispatch<SetStateAction<LineItem[]>>,
  items: LineItem[],
  id: string,
  field: keyof LineItem,
  value: string | number
) {
  setItems(
    items.map((item) =>
      item.id === id
        ? {
            ...item,
            [field]:
              typeof value === "number" && Number.isNaN(value)
                ? 0
                : typeof value === "number"
                  ? value
                  : value,
          }
        : item
    )
  )
}

function calculateTotal(items: LineItem[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.price, 0)
}
