"use client"

import * as React from "react"
import { Plus, Search, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

type DiscountType = "percent" | "amount"

type Product = {
  id: string
  name: string
  unitPriceHt: number
  vatRate: number
}

type SaleLine = {
  id: string
  productName: string
  quantity: number
  discountType: DiscountType
  discountValue: number
}

const products: Product[] = [
  {
    id: "prod-001",
    name: "Paracétamol 500mg",
    unitPriceHt: 12.5,
    vatRate: 7,
  },
  {
    id: "prod-002",
    name: "Ibuprofène 400mg",
    unitPriceHt: 9.2,
    vatRate: 7,
  },
  {
    id: "prod-003",
    name: "Vitamine C 1000",
    unitPriceHt: 6.8,
    vatRate: 0,
  },
  {
    id: "prod-004",
    name: "Gel hydroalcoolique 250ml",
    unitPriceHt: 7.6,
    vatRate: 19,
  },
  {
    id: "prod-005",
    name: "Sérum physiologique 500ml",
    unitPriceHt: 8.9,
    vatRate: 7,
  },
  {
    id: "prod-006",
    name: "Solution antiseptique usage hospitalier extra longue durée 1 L",
    unitPriceHt: 18.4,
    vatRate: 7,
  },
]

const productOptions = products.map((product) => product.name)

const discountOptions: { value: DiscountType; label: string }[] = [
  { value: "percent", label: "%" },
  { value: "amount", label: "Montant" },
]

const paymentOptions = [
  { value: "cash", label: "Espèces" },
  { value: "card", label: "Carte" },
  { value: "credit", label: "Crédit" },
]

const clientOptions = [
  "Clinique Atlas",
  "Pharmacie du Centre",
  "Dr. Rania L.",
  "Clinique internationale Mohammed VI",
  "Centre hospitalier universitaire Mohammed VI de consultation spécialisée",
]

const createEmptyLine = (): SaleLine => ({
  id: `line-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  productName: "",
  quantity: 0,
  discountType: "percent",
  discountValue: 0,
})

const dropdownTriggerBaseClassName = "bg-background rounded-md min-w-0"

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

function getLinePricing(line: SaleLine) {
  const product = products.find((item) => item.name === line.productName)
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

export function SalesPos() {
  const [lines, setLines] = React.useState<SaleLine[]>([createEmptyLine()])
  const [globalDiscountType, setGlobalDiscountType] = React.useState<DiscountType>("percent")
  const [globalDiscountValue, setGlobalDiscountValue] = React.useState(0)
  const [paymentMethod, setPaymentMethod] = React.useState<string>("")
  const [clientName, setClientName] = React.useState<string>("")
  const [notes, setNotes] = React.useState("")
  const [submitAttempted, setSubmitAttempted] = React.useState(false)

  const pricing = lines.map((line) => getLinePricing(line))
  const subtotalHt = pricing.reduce((sum, item) => sum + item.lineSubtotalHt, 0)
  const subtotalTtc = pricing.reduce((sum, item) => sum + item.lineSubtotalTtc, 0)
  const lineDiscountTotal = pricing.reduce((sum, item) => sum + item.discount, 0)
  const totalAfterLineDiscounts = Math.max(0, subtotalTtc - lineDiscountTotal)
  const globalDiscount = isPercentDiscount(globalDiscountType)
    ? (totalAfterLineDiscounts * globalDiscountValue) / 100
    : globalDiscountValue
  const totalToCollect = Math.max(0, totalAfterLineDiscounts - globalDiscount)

  const hasValidLines = lines.some((line) => line.productName && line.quantity > 0)
  const hasErrors = lines.some(
    (line) => (line.productName && line.quantity <= 0) || (!line.productName && line.quantity > 0)
  )
  const canSave = hasValidLines && !hasErrors
  const showValidation = submitAttempted && !canSave

  React.useEffect(() => {
    if (canSave && submitAttempted) {
      setSubmitAttempted(false)
    }
  }, [canSave, submitAttempted])

  const handleAddLine = () => {
    setSubmitAttempted(false)
    setLines((current) => [...current, createEmptyLine()])
  }

  const handleRemoveLine = (id: string) => {
    setLines((current) => {
      const next = current.filter((line) => line.id !== id)
      return next.length > 0 ? next : [createEmptyLine()]
    })
  }

  const updateLine = (id: string, updates: Partial<SaleLine>) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...updates } : line)))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Point de vente</CardTitle>
        <CardAction>
          <Button onClick={handleAddLine}>
            <Plus className="size-4" />
            Ajouter une ligne
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>P.U HT</TableHead>
                <TableHead>TVA</TableHead>
                <TableHead>P.U TTC</TableHead>
                <TableHead>Remise</TableHead>
                <TableHead>Total ligne</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, index) => {
                const linePricing = pricing[index]
                return (
                  <TableRow key={line.id}>
                    <TableCell className="min-w-64">
                      <Combobox
                        items={productOptions}
                        value={line.productName}
                        onValueChange={(value) => updateLine(line.id, { productName: value ?? "" })}
                      >
                        <ComboboxInput
                          placeholder="Chercher ou scanner le code barre"
                          showClear={Boolean(line.productName)}
                          showTrigger={false}
                          className="bg-background rounded-md min-w-0"
                          aria-invalid={showValidation && !line.productName}
                        >
                          <InputGroupAddon align="inline-end" className="text-muted-foreground">
                            <Search className="size-4" />
                          </InputGroupAddon>
                        </ComboboxInput>
                        <ComboboxContent align="start" alignOffset={0}>
                          <ComboboxEmpty>Aucun produit.</ComboboxEmpty>
                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item} value={item}>
                                {item}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </TableCell>
                    <TableCell className="w-28">
                      <Input
                        aria-label="Quantité"
                        type="number"
                        min={0}
                        value={line.quantity}
                        className="bg-background"
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
                          className="bg-background"
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
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Total TTC</span>
            <span className="ml-2 font-semibold text-foreground">
              {formatCurrency(totalAfterLineDiscounts)}
            </span>
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
                    className="bg-background"
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
                  onValueChange={(value) => setClientName(value ?? "")}
                >
                  <ComboboxInput
                    placeholder="Sélectionner un client"
                    showClear={Boolean(clientName)}
                    showTrigger={false}
                    className="bg-background rounded-md min-w-0"
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
                  className="bg-background"
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
      <CardFooter className="justify-end">
        {showValidation ? (
          <p className="text-destructive mr-4 text-xs">
            Ajoutez un produit et une quantité supérieure à 0 avant d&apos;enregistrer.
          </p>
        ) : null}
        <div className="relative">
          {!canSave ? (
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
          <Button disabled={!canSave}>Enregistrer la vente</Button>
        </div>
      </CardFooter>
    </Card>
  )
}
