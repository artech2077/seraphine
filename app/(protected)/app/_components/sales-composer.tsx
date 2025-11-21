"use client"

import { useMemo, useState } from "react"
import type { ComponentType } from "react"
import { BadgePercent, Banknote, CreditCard, Trash2, UsersRound, ScanBarcode } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type DiscountType = "none" | "percent" | "amount"
type PaymentType = "cash" | "card" | "credit"

type LineItem = {
  id: string
  productId: string
  name: string
  sku: string
  quantity: number
  unitPrice: number
  discountType: DiscountType
  discountValue: number
  searchQuery: string
}

type Product = {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  supplier?: string
}

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
})

const paymentOptions: Array<{ value: PaymentType; label: string; description: string; icon: ComponentType<{ className?: string }> }> =
  [
    { value: "cash", label: "Espèces", description: "Paiement immédiat en caisse", icon: Banknote },
    { value: "card", label: "Carte", description: "Terminal CB / carte bancaire", icon: CreditCard },
    { value: "credit", label: "Crédit client", description: "Ajout au compte client", icon: UsersRound },
  ]

const mockProducts: Product[] = [
  { id: "prd_1", name: "Paracétamol 500mg (16 cps)", sku: "PRC-500", price: 22, stock: 38, supplier: "SanaPharma" },
  { id: "prd_2", name: "Vitamine C 1g effervescente", sku: "VTC-001", price: 34, stock: 12, supplier: "NutriLab" },
  { id: "prd_3", name: "Sirop toux enfants 125ml", sku: "SIR-125", price: 56, stock: 6, supplier: "BioKids" },
  { id: "prd_4", name: "Masque chirurgical (boîte 50)", sku: "MSK-050", price: 75, stock: 3, supplier: "SafeMed" },
  { id: "prd_5", name: "Gel hydroalcoolique 500ml", sku: "GEL-500", price: 42, stock: 24, supplier: "Clean+Plus" },
  { id: "prd_6", name: "Thermomètre digital souple", sku: "THR-101", price: 89, stock: 15, supplier: "Meditech" },
]

function getProductMatches(query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return mockProducts.slice(0, 5)
  }
  return mockProducts
    .filter((product) => {
      return (
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized)
      )
    })
    .slice(0, 6)
}

const discountLabelMap: Record<DiscountType, string> = {
  none: "Aucune remise",
  percent: "Pourcentage",
  amount: "Montant fixe",
}

const createLineId = () => crypto.randomUUID?.() ?? `line_${Math.random().toString(36).slice(2, 9)}`

const createEmptyLine = (): LineItem => ({
  id: createLineId(),
  productId: "",
  name: "",
  sku: "",
  quantity: 1,
  unitPrice: 0,
  discountType: "none",
  discountValue: 0,
  searchQuery: "",
})

type SalesComposerProps = {
  pharmacyId: string
}

export function SalesComposer({ pharmacyId }: SalesComposerProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLine()])
  const [saleDiscountType, setSaleDiscountType] = useState<DiscountType>("none")
  const [saleDiscountValue, setSaleDiscountValue] = useState<number>(0)
  const [paymentType, setPaymentType] = useState<PaymentType>("cash")
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [activeLineId, setActiveLineId] = useState<string | null>(null)

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + computeLineTotal(item), 0)
    const saleDiscount =
      saleDiscountType === "percent"
        ? Math.min(subtotal * (saleDiscountValue / 100), subtotal)
        : saleDiscountType === "amount"
          ? Math.min(saleDiscountValue, subtotal)
          : 0
    const totalDue = Math.max(subtotal - saleDiscount, 0)

    return {
      subtotal,
      saleDiscount,
      totalDue,
    }
  }, [lineItems, saleDiscountType, saleDiscountValue])

  function touchDraft() {
    setLastUpdatedAt(new Date())
  }

  function handleAddLine() {
    setLineItems((lines) => [...lines, createEmptyLine()])
  }

  function handleSelectProduct(lineId: string, product: Product) {
    setLineItems((items) =>
      items.map((item) =>
        item.id === lineId
          ? {
              ...item,
              productId: product.id,
              name: product.name,
              sku: product.sku,
              unitPrice: product.price,
              searchQuery: product.name,
            }
          : item,
      ),
    )
    touchDraft()
  }

  function handleLineSearchChange(lineId: string, value: string) {
    setLineItems((items) => items.map((item) => (item.id === lineId ? { ...item, searchQuery: value } : item)))
  }

  function updateLineItem(id: string, patch: Partial<LineItem>) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
    touchDraft()
  }

  function removeLineItem(id: string) {
    setLineItems((items) => {
      const next = items.filter((item) => item.id !== id)
      return next.length > 0 ? next : [createEmptyLine()]
    })
    touchDraft()
  }

  const lastUpdatedLabel = lastUpdatedAt
    ? `Calcul mis à jour à ${lastUpdatedAt.toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" })}`
    : "Brouillon prêt à encaisser"

  return (
    <section id="ventes" data-pharmacy={pharmacyId} className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-[var(--radius-xl)] border border-border/70 bg-card/90 p-6 shadow-sm">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Articles vendus</p>
                  <p className="text-lg font-semibold text-foreground">Composez chaque ligne produit, quantités et prix.</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="shrink-0">
                    <ScanBarcode className="mr-2 size-4" />
                    Scanner USB
                  </Button>
                  <Button type="button" size="sm" onClick={handleAddLine}>
                    Ajouter une ligne
                  </Button>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[var(--radius-lg)] border border-border/60 bg-background/60 p-4 shadow-xs"
                  >
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1.8fr)_minmax(0,0.6fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto] md:items-start">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Produit</Label>
                        <div className="relative">
                          <Input
                            placeholder="Sélectionner ou rechercher"
                            value={item.searchQuery}
                            onFocus={() => setActiveLineId(item.id)}
                            onChange={(event) => {
                              handleLineSearchChange(item.id, event.target.value)
                              setActiveLineId(item.id)
                            }}
                            onBlur={() => setTimeout(() => setActiveLineId((current) => (current === item.id ? null : current)), 120)}
                            className="rounded-[var(--radius-md)] bg-card"
                          />
                          {activeLineId === item.id ? (
                            <ProductSuggestions
                              query={item.searchQuery}
                              onSelect={(product) => handleSelectProduct(item.id, product)}
                              selectedId={item.productId}
                            />
                          ) : null}
                        </div>
                        {item.name ? (
                          <p className="text-xs text-muted-foreground">
                            {item.name} {item.sku ? `• ${item.sku}` : ""}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Commencez à taper un nom, un code barre ou un SKU.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quantité</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) =>
                            updateLineItem(item.id, { quantity: Math.max(1, Number(event.target.value) || 1) })
                          }
                          className="rounded-[var(--radius-md)] bg-card text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prix unitaire</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.5"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateLineItem(item.id, { unitPrice: Math.max(0, Number(event.target.value) || 0) })
                          }
                          className="rounded-[var(--radius-md)] bg-card text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total ligne</Label>
                        <p className="text-xl font-semibold text-foreground">{currencyFormatter.format(computeLineTotal(item))}</p>
                        <div className="flex gap-2">
                          <Select
                            value={item.discountType}
                            onValueChange={(value: DiscountType) => {
                              updateLineItem(item.id, {
                                discountType: value,
                                discountValue: value === "none" ? 0 : item.discountValue,
                              })
                            }}
                          >
                            <SelectTrigger size="sm" className="w-[120px] rounded-[var(--radius-md)] bg-input/30">
                              <SelectValue placeholder="Remise" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucune</SelectItem>
                              <SelectItem value="percent">% ligne</SelectItem>
                              <SelectItem value="amount">Montant</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            step="0.5"
                            disabled={item.discountType === "none"}
                            value={item.discountValue}
                            onChange={(event) =>
                              updateLineItem(item.id, { discountValue: Math.max(0, Number(event.target.value) || 0) })
                            }
                            className="h-10 w-full rounded-[var(--radius-md)] bg-card text-sm disabled:opacity-60"
                            placeholder={item.discountType === "percent" ? "%" : "MAD"}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 md:justify-between">
                        <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Action</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(item.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="mr-1 size-4" />
                          Retirer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between rounded-[var(--radius-lg)] bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                <span>Total TTC estimé</span>
                <span className="text-lg font-semibold text-foreground">{currencyFormatter.format(totals.subtotal)}</span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <section className="rounded-[var(--radius-lg)] border border-border/70 bg-card/90 p-4 shadow-xs">
                  <div className="flex items-center gap-2">
                    <BadgePercent className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Remise globale</p>
                      <p className="text-xs text-muted-foreground">Appliquée après les remises ligne.</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <Select
                      value={saleDiscountType}
                      onValueChange={(value: DiscountType) => {
                        setSaleDiscountType(value)
                        if (value === "none") {
                          setSaleDiscountValue(0)
                        }
                        touchDraft()
                      }}
                    >
                      <SelectTrigger className="w-full rounded-[var(--radius-md)] bg-input/30">
                        <SelectValue placeholder="Type de remise" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune remise</SelectItem>
                        <SelectItem value="percent">% sur le panier</SelectItem>
                        <SelectItem value="amount">Montant fixe</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      disabled={saleDiscountType === "none"}
                      value={saleDiscountValue}
                      onChange={(event) => {
                        setSaleDiscountValue(Math.max(0, Number(event.target.value) || 0))
                        touchDraft()
                      }}
                      placeholder={discountLabelMap[saleDiscountType]}
                      className="h-11 rounded-[var(--radius-md)] bg-background/90 disabled:opacity-60"
                    />
                  </div>
                </section>

                <section className="rounded-[var(--radius-lg)] border border-border/70 bg-card/90 p-4 shadow-xs">
                  <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mode de paiement</Label>
                  <Select
                    value={paymentType}
                    onValueChange={(value: PaymentType) => {
                      if (value) {
                        setPaymentType(value)
                        touchDraft()
                      }
                    }}
                  >
                    <SelectTrigger className="mt-3 w-full rounded-[var(--radius-md)] bg-input/30">
                      <SelectValue placeholder="Sélectionner un mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <section className="rounded-[var(--radius-xl)] border border-border/80 bg-gradient-to-b from-background to-secondary/20 p-5 shadow-sm">
              <div className="space-y-3">
                <SummaryRow label="Sous-total" value={totals.subtotal} />
                <SummaryRow label="Remises ligne" value={lineItems.reduce((sum, item) => sum + computeLineDiscount(item), 0)} subtle />
                <SummaryRow
                  label={saleDiscountType === "none" ? "Remise panier" : `Remise panier (${discountLabelMap[saleDiscountType]})`}
                  value={totals.saleDiscount}
                  subtle
                />
                <hr className="border-border/70" />
                <SummaryRow label="Total à encaisser" value={totals.totalDue} highlight />
              </div>
            </section>
          </div>
      </div>
      <div className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-border/80 bg-card/90 p-6 shadow-sm lg:flex-row lg:items-center">
        <Badge variant="success" className="w-full justify-center rounded-[var(--radius-lg)] py-2 text-sm lg:w-auto">
          {lastUpdatedLabel}
        </Badge>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            Sauvegarder en brouillon
          </Button>
          <Button type="button" disabled={!lineItems.length} className="w-full sm:w-auto">
            Encaisser {lineItems.length ? currencyFormatter.format(totals.totalDue) : ""}
          </Button>
        </div>
      </div>
    </section>
  )
}

function SummaryRow({ label, value, subtle, highlight }: { label: string; value: number; subtle?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn("text-muted-foreground", highlight && "text-foreground font-semibold text-base")}>{label}</span>
      <span className={cn("font-semibold text-foreground", subtle && "text-muted-foreground", highlight && "text-2xl text-primary")}>
        {currencyFormatter.format(value)}
      </span>
    </div>
  )
}

type ProductSuggestionsProps = {
  query: string
  selectedId?: string
  onSelect: (product: Product) => void
}

function ProductSuggestions({ query, selectedId, onSelect }: ProductSuggestionsProps) {
  const matches = useMemo(() => getProductMatches(query), [query])
  if (!matches.length) {
    return (
      <div className="absolute left-0 right-0 z-20 mt-2 rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 text-sm text-muted-foreground shadow-lg">
        Aucun produit ne correspond à votre recherche.
      </div>
    )
  }
  return (
    <div className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-[var(--radius-lg)] border border-border/70 bg-card shadow-lg">
      {matches.map((product) => (
        <Button
          key={product.id}
          type="button"
          variant="ghost"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(product)}
          className={cn(
            "h-auto w-full justify-between gap-3 rounded-[var(--radius-lg)] px-4 py-3 text-left hover:!bg-accent/20",
            selectedId === product.id && "bg-accent/30",
          )}
        >
          <div>
            <p className="font-medium leading-tight text-foreground">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              SKU : {product.sku}
              {product.supplier ? ` • ${product.supplier}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-foreground">{currencyFormatter.format(product.price)}</p>
            <Badge variant={product.stock <= 3 ? "warning" : "outline"} className="mt-1 inline-flex">
              Stock : {product.stock}
            </Badge>
          </div>
        </Button>
      ))}
    </div>
  )
}

function computeLineDiscount(item: LineItem) {
  const subtotal = item.quantity * item.unitPrice
  if (item.discountType === "percent") {
    return Math.min(subtotal * (item.discountValue / 100), subtotal)
  }
  if (item.discountType === "amount") {
    return Math.min(item.discountValue, subtotal)
  }
  return 0
}

function computeLineTotal(item: LineItem) {
  const subtotal = item.quantity * item.unitPrice
  const discount = computeLineDiscount(item)
  return Math.max(subtotal - discount, 0)
}
