"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Filter, MoreHorizontal, Plus, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
  SheetHeader as SheetPanelHeader,
  SheetTitle,
  SheetDescription as SheetPanelDescription,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { mockInventory, type InventoryProduct } from "./mock-data"

type StockStatus = "low" | "warn" | "ok"

function getStockStatus(stock: number, threshold: number): StockStatus {
  if (stock < threshold) return "low"
  if (stock < threshold * 1.5) return "warn"
  return "ok"
}

function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  const status = getStockStatus(stock, threshold)

  const styles: Record<StockStatus, string> = {
    low: "border-destructive/30 bg-destructive/15 text-destructive",
    warn: "border-amber-200 bg-amber-50 text-amber-700",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-[3.25rem] items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold",
        styles[status]
      )}
    >
      {stock}
    </span>
  )
}

const amountFormatter = new Intl.NumberFormat("fr-MA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatAmount(value: number) {
  return amountFormatter.format(value)
}

function filterProducts({
  products,
  search,
  category,
  supplier,
  lowOnly,
}: {
  products: InventoryProduct[]
  search: string
  category: string
  supplier: string
  lowOnly: boolean
}) {
  return products.filter((product) => {
    const searchText = search.trim().toLowerCase()
    const matchesSearch =
      !searchText ||
      product.name.toLowerCase().includes(searchText) ||
      product.barcode.toLowerCase().includes(searchText)

    const matchesCategory = category === "all" || product.category === category
    const matchesSupplier = supplier === "all" || product.supplier === supplier

    const status = getStockStatus(product.stock, product.threshold)
    const matchesLowOnly = !lowOnly || status !== "ok"

    return matchesSearch && matchesCategory && matchesSupplier && matchesLowOnly
  })
}

export function InventoryTable() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [supplier, setSupplier] = useState<string>("all")
  const [lowOnly, setLowOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<InventoryProduct | null>(null)
  const [reapproProduct, setReapproProduct] = useState<InventoryProduct | null>(null)
  const [adjustProduct, setAdjustProduct] = useState<InventoryProduct | null>(null)

  const categories = useMemo(
    () => Array.from(new Set(mockInventory.map((item) => item.category))),
    []
  )
  const suppliers = useMemo(
    () => Array.from(new Set(mockInventory.map((item) => item.supplier))),
    []
  )

  const filteredProducts = useMemo(
    () =>
      filterProducts({ products: mockInventory, search, category, supplier, lowOnly }),
    [search, category, supplier, lowOnly]
  )

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle>Inventaire</CardTitle>
              <CardDescription>Données fictives pour valider l’UI et les interactions.</CardDescription>
            </div>
            <Button type="button" className="self-start md:self-auto" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Ajouter un produit
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] sm:items-center">
            <div className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 shadow-sm">
              <Search className="size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un produit ou un code-barres"
                className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Filtrer par catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={supplier} onValueChange={setSupplier}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Filtrer par fournisseur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les fournisseurs</SelectItem>
                {suppliers.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm">
              <Checkbox
                checked={lowOnly}
                onCheckedChange={(checked) => setLowOnly(checked === true)}
                aria-label="Stock bas uniquement"
              />
              <span className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                Stock bas uniquement
              </span>
            </label>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs uppercase tracking-wide text-muted-foreground">
                  <TableHead className="w-[220px]">Produit</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Seuil</TableHead>
                  <TableHead>Prix d’achat</TableHead>
                  <TableHead>Prix de vente</TableHead>
                  <TableHead>TVA</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Forme galénique</TableHead>
                  <TableHead>Code-barres</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                      Aucun produit ne correspond aux filtres sélectionnés.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="text-sm">
                      <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StockBadge stock={product.stock} threshold={product.threshold} />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{product.threshold}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatAmount(product.purchasePrice)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatAmount(product.salePrice)}</TableCell>
                      <TableCell>{product.tva}%</TableCell>
                      <TableCell className="text-muted-foreground">{product.category}</TableCell>
                      <TableCell className="text-muted-foreground">{product.supplier}</TableCell>
                      <TableCell className="text-muted-foreground">{product.galenicForm}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{product.barcode}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setEditProduct(product)}>
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setReapproProduct(product)}>
                              Réappro
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAdjustProduct(product)}>
                              Ajuster
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Badge variant="secondary" className="w-fit">
            Mode démonstration – données fictives
          </Badge>
        </CardContent>
      </Card>

      <AddOrEditProductSheet
        open={addOpen || Boolean(editProduct)}
        onOpenChange={(next) => {
          if (!next) {
            setAddOpen(false)
            setEditProduct(null)
          } else {
            setAddOpen(true)
          }
        }}
        categories={categories}
        suppliers={suppliers}
        product={editProduct}
      />

      <ReapproSheet
        product={reapproProduct}
        onOpenChange={(open) => {
          if (!open) setReapproProduct(null)
        }}
        suppliers={suppliers}
      />

      <AdjustSheet
        product={adjustProduct}
        onOpenChange={(open) => {
          if (!open) setAdjustProduct(null)
        }}
      />
    </>
  )
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

type SheetBaseProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title: string
  description?: string
}

function SheetBase({ open, onOpenChange, children, title, description }: SheetBaseProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetPanelHeader className="pb-0">
          <SheetTitle className="text-xl">{title}</SheetTitle>
          {description ? <SheetPanelDescription>{description}</SheetPanelDescription> : null}
        </SheetPanelHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6 pt-2">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

function AddOrEditProductSheet({
  open,
  onOpenChange,
  categories,
  suppliers,
  product,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: string[]
  suppliers: string[]
  product: InventoryProduct | null
}) {
  const isEdit = Boolean(product)
  return (
    <SheetBase
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Modifier le produit" : "Ajouter un produit"}
      description="Renseignez les informations principales. Les actions sont en mode démo, aucune donnée n’est enregistrée."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du produit">
          <Input defaultValue={product?.name ?? ""} placeholder="Nom commercial" />
        </Field>
        <Field label="Code-barres">
          <Input defaultValue={product?.barcode ?? ""} placeholder="EAN / GTIN" />
        </Field>
        <Field label="Catégorie">
          <Select defaultValue={product?.category ?? (categories[0] ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Fournisseur">
          <Select defaultValue={product?.supplier ?? (suppliers[0] ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un fournisseur" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((sup) => (
                <SelectItem key={sup} value={sup}>
                  {sup}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Prix d’achat">
          <Input type="number" step="0.01" defaultValue={product?.purchasePrice ?? ""} />
        </Field>
        <Field label="Prix de vente">
          <Input type="number" step="0.01" defaultValue={product?.salePrice ?? ""} />
        </Field>
        <Field label="TVA (%)">
          <Input type="number" step="1" defaultValue={product?.tva ?? "20"} />
        </Field>
        <Field label="Seuil d’alerte">
          <Input type="number" step="1" defaultValue={product?.threshold ?? "10"} />
        </Field>
        <Field label="Stock initial">
          <Input type="number" step="1" defaultValue={product?.stock ?? "0"} />
        </Field>
        <Field label="Forme galénique">
          <Input defaultValue={product?.galenicForm ?? ""} placeholder="Comprimé, gélule..." />
        </Field>
      </div>
      <Field label="Notes internes" hint="Ces notes ne sont pas visibles par les clients.">
        <Textarea placeholder="Notes de lot, consignes de stockage, etc." />
      </Field>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button type="button">{isEdit ? "Mettre à jour" : "Enregistrer"}</Button>
      </div>
    </SheetBase>
  )
}

function ReapproSheet({
  product,
  onOpenChange,
  suppliers,
}: {
  product: InventoryProduct | null
  onOpenChange: (open: boolean) => void
  suppliers: string[]
}) {
  return (
    <SheetBase
      open={Boolean(product)}
      onOpenChange={onOpenChange}
      title="Réapprovisionnement"
      description={product ? `Préparer un réassort pour ${product.name}` : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Produit">
          <Input value={product?.name ?? ""} disabled />
        </Field>
        <Field label="Stock actuel">
          <Input value={product?.stock ?? ""} disabled />
        </Field>
        <Field label="Quantité à commander">
          <Input type="number" step="1" placeholder="Ex: 24" />
        </Field>
        <Field label="Fournisseur">
          <Select defaultValue={product?.supplier ?? suppliers[0]}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un fournisseur" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((sup) => (
                <SelectItem key={sup} value={sup}>
                  {sup}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Référence commande (facultatif)">
          <Input placeholder="PO-000123" />
        </Field>
        <Field label="Date de réception estimée">
          <Input type="date" />
        </Field>
      </div>
      <Field label="Commentaire">
        <Textarea placeholder="Instructions pour la réception ou le fournisseur." />
      </Field>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
          Fermer
        </Button>
        <Button type="button">Enregistrer (démo)</Button>
      </div>
    </SheetBase>
  )
}

function AdjustSheet({
  product,
  onOpenChange,
}: {
  product: InventoryProduct | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <SheetBase
      open={Boolean(product)}
      onOpenChange={onOpenChange}
      title="Ajuster le stock"
      description={product ? `Ajustement manuel pour ${product.name}` : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Produit">
          <Input value={product?.name ?? ""} disabled />
        </Field>
        <Field label="Stock actuel">
          <Input value={product?.stock ?? ""} disabled />
        </Field>
        <Field label="Nouveau stock">
          <Input type="number" step="1" placeholder="Ex: 42" />
        </Field>
        <Field label="Motif">
          <Select defaultValue="inventaire">
            <SelectTrigger>
              <SelectValue placeholder="Choisir un motif" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inventaire">Inventaire</SelectItem>
              <SelectItem value="casse">Casse / périmé</SelectItem>
              <SelectItem value="don">Don</SelectItem>
              <SelectItem value="perte">Perte</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Commentaire">
        <Textarea placeholder="Tracez la raison de l’ajustement (visible en log d’inventaire)." />
      </Field>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
          Fermer
        </Button>
        <Button type="button">Valider (démo)</Button>
      </div>
    </SheetBase>
  )
}
