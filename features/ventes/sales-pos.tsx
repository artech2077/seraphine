"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { InputGroupAddon } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { normalizeBarcode } from "@/lib/barcode"
import { useClients } from "@/features/clients/api"
import { useProductCatalog } from "@/features/inventaire/api"
import { ProductSearchPanel } from "@/features/products/product-search-panel"
import { useSalesHistory } from "@/features/ventes/api"
import type { SaleHistoryItem } from "@/features/ventes/sales-history-table"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"

type DiscountType = "percent" | "amount"

type Product = {
  id: string
  name: string
  barcode: string
  category: string
  sellingPrice: number
  stockQuantity: number
  lowStockThreshold: number
  unitPriceHt: number
  vatRate: number
}

type SaleLine = {
  id: string
  productId?: string
  productName: string
  quantity: number
  discountType: DiscountType
  discountValue: number
}

const discountOptions: { value: DiscountType; label: string }[] = [
  { value: "percent", label: "%" },
  { value: "amount", label: "Montant" },
]

const paymentOptions = [
  { value: "cash", label: "Espèces" },
  { value: "card", label: "Carte" },
  { value: "credit", label: "Crédit" },
]

function mergeProductIntoLines(current: SaleLine[], product: Product) {
  const existingIndex = current.findIndex(
    (line) => line.productId === product.id || line.productName === product.name
  )
  if (existingIndex !== -1) {
    return current.map((line, index) =>
      index === existingIndex
        ? {
            ...line,
            productId: product.id,
            productName: product.name,
            quantity: line.quantity + 1,
          }
        : line
    )
  }

  return [
    ...current,
    {
      id: `line-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      discountType: "percent",
      discountValue: 0,
    },
  ]
}

const dropdownTriggerBaseClassName = "bg-popover rounded-md min-w-0"

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function parseNumericInput(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function isPercentDiscount(type: DiscountType) {
  return type === "percent"
}

function getDiscountLabel(type: DiscountType) {
  return type === "amount" ? "Montant" : "%"
}

function getPaymentLabel(value: string | null | undefined) {
  if (!value) {
    return "Sélectionner un mode"
  }
  return paymentOptions.find((option) => option.value === value)?.label ?? value
}

function getLinePricing(line: SaleLine, products: Product[]) {
  const product = line.productId
    ? products.find((item) => item.id === line.productId)
    : products.find((item) => item.name === line.productName)
  const unitPriceHt = product?.unitPriceHt ?? 0
  const vatRate = product?.vatRate ?? 0
  const unitPriceTtc = unitPriceHt * (1 + vatRate / 100)
  const lineSubtotalHt = unitPriceHt * line.quantity
  const lineSubtotalTtc = unitPriceTtc * line.quantity
  const discount = isPercentDiscount(line.discountType)
    ? (lineSubtotalTtc * line.discountValue) / 100
    : line.discountValue
  const lineTotal = Math.max(0, lineSubtotalTtc - discount)

  return {
    unitPriceHt,
    vatRate,
    unitPriceTtc,
    lineSubtotalHt,
    lineSubtotalTtc,
    discount,
    lineTotal,
  }
}

type SalesPosProps = {
  editingSale?: SaleHistoryItem | null
  onEditComplete?: () => void
  onCancelEdit?: () => void
}

export function SalesPos({ editingSale = null, onEditComplete, onCancelEdit }: SalesPosProps) {
  const { orgId } = useAuth()
  const { items: clients } = useClients()
  const { items: catalogItems } = useProductCatalog()
  const { createSale, updateSale } = useSalesHistory({ mode: "mutations" })
  const { canManage } = useRoleAccess()
  const canManageSales = canManage("ventes")
  const [lines, setLines] = React.useState<SaleLine[]>([])
  const [globalDiscountType, setGlobalDiscountType] = React.useState<DiscountType>("percent")
  const [globalDiscountValue, setGlobalDiscountValue] = React.useState(0)
  const [paymentMethod, setPaymentMethod] = React.useState<string>("")
  const [clientName, setClientName] = React.useState<string>("")
  const [clientId, setClientId] = React.useState<string | undefined>(undefined)
  const [notes, setNotes] = React.useState("")
  const [submitAttempted, setSubmitAttempted] = React.useState(false)
  const isEditing = Boolean(editingSale)

  const products = React.useMemo<Product[]>(
    () =>
      catalogItems.map((item) => ({
        id: item.id,
        name: item.name,
        barcode: item.barcode,
        category: item.category,
        sellingPrice: item.sellingPrice,
        stockQuantity: item.stockQuantity,
        lowStockThreshold: item.lowStockThreshold,
        unitPriceHt: item.sellingPrice,
        vatRate: item.vatRate,
      })),
    [catalogItems]
  )
  const clientOptions = React.useMemo(() => clients.map((client) => client.name), [clients])
  const barcodeMap = React.useMemo(() => {
    const map = new Map<string, Product>()
    products.forEach((product) => {
      const normalized = normalizeBarcode(product.barcode)
      if (normalized) {
        map.set(normalized, product)
      }
    })
    return map
  }, [products])

  const resetForm = React.useCallback(() => {
    setLines([])
    setGlobalDiscountType("percent")
    setGlobalDiscountValue(0)
    setPaymentMethod("")
    setClientName("")
    setClientId(undefined)
    setNotes("")
    setSubmitAttempted(false)
  }, [])

  const handleCancelEdit = React.useCallback(() => {
    onCancelEdit?.()
    if (!onCancelEdit) {
      resetForm()
    }
  }, [onCancelEdit, resetForm])

  const handleAddProductFromSearch = React.useCallback((product: Product) => {
    setSubmitAttempted(false)
    setLines((current) => mergeProductIntoLines(current, product))
  }, [])

  const handleBarcodeScan = React.useCallback(
    (barcode: string) => {
      const match = barcodeMap.get(barcode)
      if (!match) {
        toast.error("Code barre inconnu.")
        return
      }

      setLines((current) => mergeProductIntoLines(current, match))
    },
    [barcodeMap]
  )

  useBarcodeScanner({ clerkOrgId: orgId, enabled: canManageSales, onScan: handleBarcodeScan })

  const appliedEditId = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!editingSale) {
      resetForm()
      appliedEditId.current = null
    }
  }, [editingSale, resetForm])

  React.useEffect(() => {
    if (!editingSale) return
    const hasMissingProductIds = editingSale.items.some((item) => !item.productId)
    const needsProductMapping = hasMissingProductIds && products.length > 0
    const needsClientMapping =
      !editingSale.clientId &&
      Boolean(editingSale.client) &&
      editingSale.client !== "-" &&
      clients.length > 0

    if (appliedEditId.current === editingSale.id && !needsProductMapping && !needsClientMapping) {
      return
    }

    appliedEditId.current = editingSale.id

    const nextLines = editingSale.items.map((item) => {
      const productId =
        item.productId ?? products.find((product) => product.name === item.product)?.id ?? undefined

      return {
        id: `line-${editingSale.id}-${item.id}`,
        productId,
        productName: item.product,
        quantity: item.quantity,
        discountType: item.discountType ?? "percent",
        discountValue: item.discountValue ?? 0,
      }
    })

    const clientLabel = editingSale.client && editingSale.client !== "-" ? editingSale.client : ""
    const matchedClient = clientLabel
      ? clients.find((client) => client.name === clientLabel)
      : undefined

    setLines(nextLines)
    setGlobalDiscountType(editingSale.globalDiscountType ?? "percent")
    setGlobalDiscountValue(editingSale.globalDiscountValue ?? 0)
    setPaymentMethod(editingSale.paymentMethodValue ?? "")
    setClientName(clientLabel)
    setClientId(editingSale.clientId ?? matchedClient?.id)
    setNotes("")
    setSubmitAttempted(false)
  }, [clients, editingSale, products])

  const pricing = lines.map((line) => getLinePricing(line, products))
  const subtotalHt = pricing.reduce((sum, item) => sum + item.lineSubtotalHt, 0)
  const subtotalTtc = pricing.reduce((sum, item) => sum + item.lineSubtotalTtc, 0)
  const lineDiscountTotal = pricing.reduce((sum, item) => sum + item.discount, 0)
  const totalAfterLineDiscounts = Math.max(0, subtotalTtc - lineDiscountTotal)
  const globalDiscount = isPercentDiscount(globalDiscountType)
    ? (totalAfterLineDiscounts * globalDiscountValue) / 100
    : globalDiscountValue
  const totalToCollect = Math.max(0, totalAfterLineDiscounts - globalDiscount)

  const hasValidLines = lines.some((line) => line.productId && line.quantity > 0)
  const hasErrors = lines.some((line) => line.quantity <= 0)
  const canSave = hasValidLines && !hasErrors && canManageSales
  const showValidation = submitAttempted && !canSave && canManageSales

  React.useEffect(() => {
    if (canSave && submitAttempted) {
      setSubmitAttempted(false)
    }
  }, [canSave, submitAttempted])

  const handleRemoveLine = (id: string) => {
    setLines((current) => current.filter((line) => line.id !== id))
  }

  const updateLine = (id: string, updates: Partial<SaleLine>) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...updates } : line)))
  }

  async function handleSaveSale() {
    if (!canManageSales) return
    if (!hasValidLines || hasErrors) {
      setSubmitAttempted(true)
      toast.error("Ajoutez un produit et une quantité supérieure à 0.")
      return
    }
    if (!paymentMethod) {
      toast.error("Sélectionnez un mode de paiement.")
      return
    }

    try {
      const payload = {
        clientId,
        paymentMethod: paymentMethod as "cash" | "card" | "credit" | "check",
        globalDiscountType,
        globalDiscountValue,
        lines: lines
          .filter((line) => line.productId && line.quantity > 0)
          .map((line, index) => ({
            productId: line.productId as string,
            productName: line.productName,
            quantity: line.quantity,
            unitPriceHt: pricing[index]?.unitPriceHt ?? 0,
            vatRate: pricing[index]?.vatRate ?? 0,
            discountType: line.discountType,
            discountValue: line.discountValue,
          })),
      }

      if (isEditing && editingSale) {
        await updateSale({
          id: editingSale.id,
          ...payload,
        })
        toast.success("Vente mise à jour.")
        onEditComplete?.()
        resetForm()
        return
      }

      await createSale(payload)

      toast.success("Vente enregistrée.")
      resetForm()
    } catch {
      toast.error(
        isEditing ? "Impossible de modifier la vente." : "Impossible d'enregistrer la vente."
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <CardTitle className="text-base">
            {isEditing ? "Modifier la vente" : "Point de vente"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-muted-foreground">
          Astuce : vous pouvez scanner avec un lecteur ou ouvrir /scan sur un téléphone connecté.
        </p>
        <div className="space-y-3">
          <ProductSearchPanel
            products={products}
            onAddProduct={handleAddProductFromSearch}
            contextLabel="POS"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>PPH</TableHead>
                <TableHead>TVA</TableHead>
                <TableHead>PPV</TableHead>
                <TableHead>Remise</TableHead>
                <TableHead>Total ligne</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Aucun produit sélectionné. Ajoutez depuis la recherche ci-dessus ou scannez un
                    code-barres.
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line, index) => {
                  const linePricing = pricing[index]
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="min-w-64">
                        <span
                          className="block rounded-md bg-popover px-3 py-2"
                          aria-invalid={showValidation && !line.productName}
                        >
                          {line.productName}
                        </span>
                      </TableCell>
                      <TableCell className="w-28">
                        <Input
                          aria-label="Quantité"
                          type="number"
                          min={0}
                          value={line.quantity}
                          className="bg-popover"
                          aria-invalid={showValidation && line.quantity <= 0}
                          onChange={(event) =>
                            updateLine(line.id, {
                              quantity: parseNumericInput(event.target.value),
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="w-28">
                        <span className="text-foreground">
                          {formatCurrency(linePricing.unitPriceHt)}
                        </span>
                      </TableCell>
                      <TableCell className="w-20">
                        <span className="text-foreground">{linePricing.vatRate}%</span>
                      </TableCell>
                      <TableCell className="w-28">
                        <span className="text-foreground">
                          {formatCurrency(linePricing.unitPriceTtc)}
                        </span>
                      </TableCell>
                      <TableCell className="w-40">
                        <ButtonGroup className="w-full">
                          <Select
                            value={line.discountType}
                            onValueChange={(value) =>
                              updateLine(line.id, {
                                discountType: value as DiscountType,
                              })
                            }
                          >
                            <SelectTrigger className={`${dropdownTriggerBaseClassName} w-24`}>
                              <SelectValue>
                                {(value) => getDiscountLabel((value as DiscountType) ?? "percent")}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {discountOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            aria-label="Valeur de remise"
                            type="number"
                            min={0}
                            value={line.discountValue}
                            className="bg-popover"
                            onChange={(event) =>
                              updateLine(line.id, {
                                discountValue: parseNumericInput(event.target.value),
                              })
                            }
                          />
                        </ButtonGroup>
                      </TableCell>
                      <TableCell className="w-32">
                        <span className="text-foreground font-semibold">
                          {formatCurrency(linePricing.lineTotal)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Supprimer la ligne"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveLine(line.id)}
                          disabled={!canManageSales}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <div className="flex items-center">
              <span className="font-medium text-foreground">Total TTC</span>
              <span className="ml-2 font-semibold text-foreground">
                {formatCurrency(totalAfterLineDiscounts)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Remise globale</Label>
                <ButtonGroup className="w-full">
                  <Select
                    value={globalDiscountType}
                    onValueChange={(value) => setGlobalDiscountType(value as DiscountType)}
                  >
                    <SelectTrigger className={`${dropdownTriggerBaseClassName} w-24`}>
                      <SelectValue>
                        {(value) => getDiscountLabel((value as DiscountType) ?? "percent")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {discountOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label="Valeur remise globale"
                    type="number"
                    min={0}
                    value={globalDiscountValue}
                    className="bg-popover"
                    onChange={(event) =>
                      setGlobalDiscountValue(parseNumericInput(event.target.value))
                    }
                  />
                </ButtonGroup>
              </div>
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value ?? "")}
                >
                  <SelectTrigger className={`${dropdownTriggerBaseClassName} w-full`}>
                    <SelectValue>{(value) => getPaymentLabel(value)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Client</Label>
                <Combobox
                  items={clientOptions}
                  value={clientName}
                  onValueChange={(value) => {
                    const nextValue = value ?? ""
                    setClientName(nextValue)
                    setClientId(clients.find((client) => client.name === nextValue)?.id)
                  }}
                >
                  <ComboboxInput
                    placeholder="Sélectionner un client"
                    showClear={Boolean(clientName)}
                    showTrigger={false}
                    className="bg-popover rounded-md min-w-0"
                  >
                    <InputGroupAddon align="inline-end" className="text-muted-foreground">
                      <Search className="size-4" />
                    </InputGroupAddon>
                  </ComboboxInput>
                  <ComboboxContent align="start" alignOffset={0}>
                    <ComboboxEmpty>Aucun client.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="bg-popover"
                  placeholder="Ajouter une note de livraison ou de préparation."
                />
              </div>
            </div>
          </div>

          <Card size="sm" className="h-fit">
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span>{formatCurrency(subtotalHt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sous-total TTC</span>
                <span>{formatCurrency(subtotalTtc)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remise</span>
                <span>{formatCurrency(lineDiscountTotal + globalDiscount)}</span>
              </div>
              <Separator />
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Total à encaisser</span>
                  <span>{formatCurrency(totalToCollect)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-3">
        {showValidation ? (
          <p className="text-destructive text-xs">
            Ajoutez un produit et une quantité supérieure à 0 avant d&apos;enregistrer.
          </p>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {isEditing ? (
            <Button variant="outline" onClick={handleCancelEdit}>
              Annuler la modification
            </Button>
          ) : null}
          <div className="relative">
            {!canSave && canManageSales ? (
              <span
                role="button"
                tabIndex={0}
                aria-label="Valider la vente"
                className="absolute inset-0 cursor-not-allowed rounded-lg"
                onClick={() => setSubmitAttempted(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setSubmitAttempted(true)
                  }
                }}
              />
            ) : null}
            <Button disabled={!canSave} onClick={handleSaveSale}>
              {isEditing ? "Mettre à jour la vente" : "Enregistrer la vente"}
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
