"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalForm,
  ModalGrid,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  CHANNEL_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  type DeliveryNote,
  type ProductOption,
  type ProcurementLotItem,
  type ProcurementLineItem,
  type PurchaseOrder,
} from "@/features/achats/procurement-data"
import { ProductSearchPanel } from "@/features/products/product-search-panel"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { normalizeBarcode } from "@/lib/barcode"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"

type SupplierOption = {
  id: string
  name: string
}

type DiscountType = "percent" | "amount"

type ProcurementLineDraft = Omit<ProcurementLineItem, "lots"> & {
  productId?: string
  discountType: DiscountType
  discountValue: number
  lots: ProcurementLotDraft[]
}

type ProcurementLotDraft = ProcurementLotItem & {
  id: string
}

const emptyLot = (): ProcurementLotDraft => ({
  id: `lot-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  lotNumber: "",
  expiryDate: "",
  quantity: 0,
})

const emptyLine = (): ProcurementLineDraft => ({
  id: `line-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  product: "",
  quantity: 0,
  unitPrice: 0,
  discountType: "percent",
  discountValue: 0,
  lots: [],
})

function mergeProductIntoProcurementLines(current: ProcurementLineDraft[], product: ProductOption) {
  const existingIndex = current.findIndex(
    (line) => line.productId === product.id || line.product === product.name
  )
  if (existingIndex !== -1) {
    return current.map((line, index) =>
      index === existingIndex
        ? {
            ...line,
            product: product.name,
            productId: product.id,
            unitPrice: product.unitPrice,
            quantity: line.quantity + 1,
          }
        : line
    )
  }

  return [
    ...current,
    {
      ...emptyLine(),
      product: product.name,
      productId: product.id,
      unitPrice: product.unitPrice,
      quantity: 1,
    },
  ]
}

const discountOptions: { value: DiscountType; label: string }[] = [
  { value: "percent", label: "%" },
  { value: "amount", label: "Montant" },
]

const dropdownTriggerBaseClassName = "bg-popover rounded-md min-w-0"

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function parseNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function isPercentDiscount(type: DiscountType) {
  return type === "percent"
}

function getLineTotals(line: ProcurementLineDraft, product?: ProductOption) {
  const subtotalHt = line.unitPrice * line.quantity
  const discount = isPercentDiscount(line.discountType)
    ? (subtotalHt * line.discountValue) / 100
    : line.discountValue
  const total = Math.max(0, subtotalHt - discount)
  const vatRate = product?.vatRate ?? 0
  const sellingPriceHt = product?.sellingPrice ?? line.unitPrice
  const unitPriceTtc = sellingPriceHt * (1 + vatRate / 100)
  const subtotalPpv = unitPriceTtc * line.quantity

  return {
    unitPrice: line.unitPrice,
    subtotalHt,
    vatRate,
    unitPriceTtc,
    subtotalPpv,
    total,
  }
}

type ProcurementOrderModalProps = {
  mode: "create" | "edit"
  variant: "purchase" | "delivery"
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  order?: PurchaseOrder | DeliveryNote
  suppliers: SupplierOption[]
  products: ProductOption[]
  onSubmit?: (values: {
    supplierId: string
    channel: string
    status: string
    orderDate: string
    dueDate?: string
    externalReference?: string
    globalDiscountType?: "percent" | "amount"
    globalDiscountValue?: number
    items: Array<{
      productId: string
      quantity: number
      unitPrice: number
      lineDiscountType?: "percent" | "amount"
      lineDiscountValue?: number
      lots?: Array<{
        lotNumber: string
        expiryDate: string
        quantity: number
      }>
    }>
  }) => void | Promise<void>
}

export function ProcurementOrderModal({
  mode,
  variant,
  trigger,
  open,
  onOpenChange,
  order,
  suppliers,
  products,
  onSubmit,
}: ProcurementOrderModalProps) {
  const { orgId } = useAuth()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const resolvedOpen = isControlled ? open : internalOpen
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen
  const { canManage } = useRoleAccess()
  const canManagePurchases = canManage("achats")
  const id = React.useId()
  const isEdit = mode === "edit"
  const isDelivery = variant === "delivery"
  const showLineDiscount = isDelivery
  const showGlobalDiscount = isDelivery

  const title = isEdit
    ? isDelivery
      ? "Modifier un bon de livraison"
      : "Modifier un bon de commande"
    : isDelivery
      ? "Créer un bon de livraison"
      : "Créer un bon de commande"

  const [supplier, setSupplier] = React.useState(order?.supplier ?? "")
  const [supplierId, setSupplierId] = React.useState(
    (order as { supplierId?: string } | undefined)?.supplierId ?? ""
  )
  const [channel, setChannel] = React.useState(order?.channel ?? "")
  const [status, setStatus] = React.useState(order?.status ?? "Brouillon")
  const [orderDate, setOrderDate] = React.useState(order?.orderDate ?? "")
  const [dueDate, setDueDate] = React.useState(
    (order as { dueDate?: string } | undefined)?.dueDate ?? ""
  )
  const [externalReference, setExternalReference] = React.useState(
    (order as DeliveryNote | undefined)?.externalReference ?? ""
  )
  const [globalDiscountType, setGlobalDiscountType] = React.useState<DiscountType>("percent")
  const [globalDiscountValue, setGlobalDiscountValue] = React.useState(0)
  const [lines, setLines] = React.useState<ProcurementLineDraft[]>(() =>
    order?.items?.length
      ? order.items.map((item) => ({
          ...item,
          productId: item.productId,
          discountType: item.lineDiscountType ?? "percent",
          discountValue: item.lineDiscountValue ?? 0,
          lots:
            item.lots?.map((lot) => ({
              id: `lot-${item.id}-${lot.lotNumber}-${lot.expiryDate}`,
              lotNumber: lot.lotNumber,
              expiryDate: lot.expiryDate,
              quantity: lot.quantity,
            })) ?? [],
        }))
      : []
  )

  const supplierMap = React.useMemo(
    () => new Map(suppliers.map((option) => [option.name, option.id])),
    [suppliers]
  )
  const productMapByName = React.useMemo(
    () => new Map(products.map((option) => [option.name, option])),
    [products]
  )
  const productMapById = React.useMemo(
    () => new Map(products.map((option) => [option.id, option])),
    [products]
  )
  const barcodeMap = React.useMemo(() => {
    const map = new Map<string, ProductOption>()
    products.forEach((option) => {
      const normalized = normalizeBarcode(option.barcode)
      if (normalized) {
        map.set(normalized, option)
      }
    })
    return map
  }, [products])

  React.useEffect(() => {
    const nextLines = order?.items?.length
      ? order.items.map((item) => ({
          ...item,
          productId: item.productId ?? productMapByName.get(item.product)?.id,
          discountType: item.lineDiscountType ?? "percent",
          discountValue: item.lineDiscountValue ?? 0,
          lots:
            item.lots?.map((lot) => ({
              id: `lot-${item.id}-${lot.lotNumber}-${lot.expiryDate}`,
              lotNumber: lot.lotNumber,
              expiryDate: lot.expiryDate,
              quantity: lot.quantity,
            })) ?? [],
        }))
      : []
    setLines(nextLines)
    const nextSupplier = order?.supplier ?? ""
    const nextSupplierId =
      (order as { supplierId?: string } | undefined)?.supplierId ??
      (nextSupplier ? (supplierMap.get(nextSupplier) ?? "") : "")
    setSupplier(nextSupplier)
    setSupplierId(nextSupplierId)
    setChannel(order?.channel ?? "")
    setStatus(order?.status ?? "Brouillon")
    setOrderDate(order?.orderDate ?? "")
    setDueDate((order as { dueDate?: string } | undefined)?.dueDate ?? "")
    setExternalReference((order as DeliveryNote | undefined)?.externalReference ?? "")
    setGlobalDiscountType(
      (order as { globalDiscountType?: DiscountType } | undefined)?.globalDiscountType ?? "percent"
    )
    setGlobalDiscountValue(
      (order as { globalDiscountValue?: number } | undefined)?.globalDiscountValue ?? 0
    )
  }, [order, productMapByName, supplierMap])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitWithStatus(status)
  }

  const lineTotals = lines.map((line) => {
    const selectedProduct = line.productId
      ? (productMapById.get(line.productId) ?? productMapByName.get(line.product))
      : productMapByName.get(line.product)
    return getLineTotals(line, selectedProduct)
  })
  const linesWithProduct = lines.filter((line) => line.product.trim())
  const totalLines = linesWithProduct.length
  const totalProducts = linesWithProduct.reduce((sum, line) => sum + line.quantity, 0)
  const totalHt = lineTotals.reduce((sum, line) => sum + line.subtotalHt, 0)
  const totalTtc = lineTotals.reduce((sum, line) => sum + line.subtotalPpv, 0)
  const lineDiscountTotal = lineTotals.reduce(
    (sum, line) => sum + (line.subtotalHt - line.total),
    0
  )
  const totalAfterLineDiscounts = Math.max(0, totalHt - lineDiscountTotal)
  const globalDiscount = isPercentDiscount(globalDiscountType)
    ? (totalAfterLineDiscounts * globalDiscountValue) / 100
    : globalDiscountValue
  const totalDiscount = lineDiscountTotal + globalDiscount
  const totalOrder = Math.max(0, totalAfterLineDiscounts - globalDiscount)

  const handleRemoveLine = (lineId: string) => {
    setLines((current) => current.filter((line) => line.id !== lineId))
  }

  const updateLine = (lineId: string, updates: Partial<ProcurementLineDraft>) => {
    setLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, ...updates } : line))
    )
  }

  const addLotToLine = (lineId: string) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              lots: [...(line.lots ?? []), emptyLot()],
            }
          : line
      )
    )
  }

  const updateLot = (
    lineId: string,
    lotId: string,
    updates: Partial<Pick<ProcurementLotDraft, "lotNumber" | "expiryDate" | "quantity">>
  ) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              lots: (line.lots ?? []).map((lot) =>
                lot.id === lotId ? { ...lot, ...updates } : lot
              ),
            }
          : line
      )
    )
  }

  const removeLot = (lineId: string, lotId: string) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              lots: (line.lots ?? []).filter((lot) => lot.id !== lotId),
            }
          : line
      )
    )
  }

  const handleAddProductFromSearch = React.useCallback((product: ProductOption) => {
    setLines((current) => mergeProductIntoProcurementLines(current, product))
  }, [])

  const handleBarcodeScan = React.useCallback(
    (barcode: string) => {
      const match = barcodeMap.get(barcode)
      if (!match) {
        toast.error("Code barre inconnu.")
        return
      }

      setLines((current) => mergeProductIntoProcurementLines(current, match))
    },
    [barcodeMap]
  )

  useBarcodeScanner({
    clerkOrgId: orgId,
    enabled: canManagePurchases && resolvedOpen,
    onScan: handleBarcodeScan,
  })

  const submitWithStatus = (nextStatus: string) => {
    const resolvedLines = lines
      .filter((line) => line.product.trim())
      .map((line) => ({
        line,
        productId: line.productId ?? productMapByName.get(line.product)?.id,
      }))

    if (!supplierId) {
      toast.error("Veuillez sélectionner un fournisseur.")
      return
    }
    if (!orderDate) {
      toast.error("Veuillez renseigner une date.")
      return
    }
    if (resolvedLines.length === 0) {
      toast.error("Ajoutez au moins un article valide.")
      return
    }
    if (resolvedLines.some((entry) => !entry.productId)) {
      toast.error("Veuillez re-sélectionner les produits manquants.")
      return
    }
    if (resolvedLines.some((entry) => entry.line.quantity <= 0)) {
      toast.error("Veuillez renseigner une quantité valide.")
      return
    }

    const isDeliveredStatus = isDelivery && nextStatus === "Livré"
    const lineLots = resolvedLines.map(({ line }) =>
      (line.lots ?? [])
        .filter((lot) => lot.lotNumber.trim() || lot.expiryDate || lot.quantity > 0)
        .map((lot) => ({
          lotNumber: lot.lotNumber.trim(),
          expiryDate: lot.expiryDate,
          quantity: lot.quantity,
        }))
    )

    if (isDelivery) {
      const hasIncompleteLot = lineLots.some((lots) =>
        lots.some((lot) => !lot.lotNumber || !lot.expiryDate || lot.quantity <= 0)
      )
      if (hasIncompleteLot) {
        toast.error("Chaque lot doit avoir un numéro, une date d'expiration et une quantité.")
        return
      }

      const hasInvalidLotDate = lineLots.some((lots) =>
        lots.some((lot) => Number.isNaN(Date.parse(lot.expiryDate)))
      )
      if (hasInvalidLotDate) {
        toast.error("Une date d'expiration de lot est invalide.")
        return
      }

      const hasDuplicateLots = lineLots.some((lots) => {
        const unique = new Set(lots.map((lot) => lot.lotNumber.toLocaleUpperCase("fr")))
        return unique.size !== lots.length
      })
      if (hasDuplicateLots) {
        toast.error("Un même produit ne peut pas contenir deux fois le même numéro de lot.")
        return
      }

      if (isDeliveredStatus) {
        const hasMissingLots = lineLots.some((lots) => lots.length === 0)
        if (hasMissingLots) {
          toast.error("Les lots sont obligatoires pour enregistrer un bon en statut Livré.")
          return
        }

        const hasQuantityMismatch = lineLots.some((lots, index) => {
          const lotTotal = lots.reduce((sum, lot) => sum + lot.quantity, 0)
          return Math.abs(lotTotal - resolvedLines[index].line.quantity) > 0.0001
        })
        if (hasQuantityMismatch) {
          toast.error("La somme des quantités par lot doit correspondre à la quantité de la ligne.")
          return
        }
      }
    }

    const items = resolvedLines.map(({ line, productId }, index) => ({
      productId: productId as string,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineDiscountType: isDelivery ? line.discountType : undefined,
      lineDiscountValue: isDelivery ? line.discountValue : undefined,
      lots: isDelivery && lineLots[index].length > 0 ? lineLots[index] : undefined,
    }))

    void Promise.resolve(
      onSubmit?.({
        supplierId,
        channel,
        status: nextStatus,
        orderDate,
        dueDate: isDelivery ? dueDate || undefined : undefined,
        externalReference: isDelivery ? externalReference : undefined,
        globalDiscountType: isDelivery ? globalDiscountType : undefined,
        globalDiscountValue: isDelivery ? globalDiscountValue : undefined,
        items,
      })
    )
      .then(() => {
        toast.success(isDelivery ? "Bon de livraison enregistré." : "Bon de commande enregistré.")
        handleOpenChange?.(false)
      })
      .catch(() => {
        toast.error("Impossible d'enregistrer ce document.")
      })
  }

  return (
    <Modal open={resolvedOpen} onOpenChange={handleOpenChange}>
      {trigger ? <ModalTrigger render={trigger} /> : null}
      <ModalContent showCloseButton className="sm:w-3/5 md:w-3/5 lg:w-3/5 xl:w-3/5">
        <ModalHeader showCloseButton>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        <ModalForm onSubmit={handleSubmit}>
          <ModalBody>
            {isDelivery ? (
              <>
                <ModalGrid>
                  <div className="grid gap-3">
                    <Label htmlFor={`${id}-supplier`}>Fournisseur</Label>
                    <Combobox
                      items={suppliers.map((option) => option.name)}
                      value={supplier}
                      onValueChange={(value) => {
                        const nextValue = value ?? ""
                        setSupplier(nextValue)
                        setSupplierId(nextValue ? (supplierMap.get(nextValue) ?? "") : "")
                      }}
                    >
                      <ComboboxInput
                        id={`${id}-supplier`}
                        placeholder="Rechercher un fournisseur"
                        showClear={Boolean(supplier)}
                        className="bg-popover rounded-md min-w-0"
                      />
                      <ComboboxContent align="start" alignOffset={0}>
                        <ComboboxEmpty>Aucun résultat.</ComboboxEmpty>
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
                  <div className="grid gap-3">
                    <Label htmlFor={`${id}-channel`}>Canal</Label>
                    <Select value={channel} onValueChange={(value) => setChannel(value ?? "")}>
                      <SelectTrigger id={`${id}-channel`} className="w-full">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNEL_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor={`${id}-status`}>Statut</Label>
                    <Select
                      value={status}
                      onValueChange={(value) => setStatus(value ?? "Brouillon")}
                    >
                      <SelectTrigger
                        id={`${id}-status`}
                        className={`${dropdownTriggerBaseClassName} w-full`}
                      >
                        <SelectValue placeholder="Sélectionner un statut" />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </ModalGrid>
                <ModalGrid>
                  <div className="grid gap-3">
                    <Label htmlFor={`${id}-order-date`}>Date du bon de livraison</Label>
                    <Input
                      id={`${id}-order-date`}
                      type="date"
                      value={orderDate}
                      placeholder="Date de commande"
                      onChange={(event) => setOrderDate(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor={`${id}-due-date`}>Date d&apos;échéance</Label>
                    <Input
                      id={`${id}-due-date`}
                      type="date"
                      value={dueDate}
                      placeholder="Date de commande"
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </div>
                </ModalGrid>
              </>
            ) : (
              <ModalGrid>
                <div className="grid gap-3">
                  <Label htmlFor={`${id}-supplier`}>Fournisseur</Label>
                  <Combobox
                    items={suppliers.map((option) => option.name)}
                    value={supplier}
                    onValueChange={(value) => {
                      const nextValue = value ?? ""
                      setSupplier(nextValue)
                      setSupplierId(nextValue ? (supplierMap.get(nextValue) ?? "") : "")
                    }}
                  >
                    <ComboboxInput
                      id={`${id}-supplier`}
                      placeholder="Rechercher un fournisseur"
                      showClear={Boolean(supplier)}
                      className="bg-popover rounded-md min-w-0"
                    />
                    <ComboboxContent align="start" alignOffset={0}>
                      <ComboboxEmpty>Aucun résultat.</ComboboxEmpty>
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
                <div className="grid gap-3">
                  <Label htmlFor={`${id}-order-date`}>Date de bon de commande</Label>
                  <Input
                    id={`${id}-order-date`}
                    type="date"
                    value={orderDate}
                    placeholder="Date de commande"
                    onChange={(event) => setOrderDate(event.target.value)}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor={`${id}-status`}>Statut</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value ?? "Brouillon")}>
                    <SelectTrigger
                      id={`${id}-status`}
                      className={`${dropdownTriggerBaseClassName} w-full`}
                    >
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {PURCHASE_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </ModalGrid>
            )}
            {isDelivery ? (
              <div className="grid gap-3">
                <Label htmlFor={`${id}-external-ref`}>Réf livraison</Label>
                <Input
                  id={`${id}-external-ref`}
                  placeholder="Référence fournisseur"
                  value={externalReference}
                  onChange={(event) => setExternalReference(event.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-3">
              <div className="text-sm font-semibold">Articles</div>
              <p className="text-xs text-muted-foreground">
                Astuce : utilisez un lecteur ou ouvrez /scan sur un téléphone connecté.
              </p>
              <ProductSearchPanel
                products={products}
                onAddProduct={handleAddProductFromSearch}
                contextLabel={isDelivery ? "bon de livraison" : "bon de commande"}
              />
              <div className="rounded-lg border border-border">
                <div className="overflow-x-auto p-4">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className={
                            showLineDiscount ? "w-48 text-xs text-left" : "w-56 text-xs text-left"
                          }
                        >
                          Produit
                        </TableHead>
                        <TableHead className="w-16 px-1 text-xs text-left">Quantité</TableHead>
                        {showLineDiscount ? (
                          <TableHead className="w-32 px-1 text-xs leading-tight whitespace-normal text-left">
                            Remise ligne
                          </TableHead>
                        ) : null}
                        <TableHead className="w-12 px-1 text-xs text-right">P.U</TableHead>
                        <TableHead className="w-12 px-1 text-xs text-right">PPH</TableHead>
                        <TableHead className="w-10 px-1 text-xs text-right">TVA</TableHead>
                        <TableHead className="w-12 px-1 text-xs text-right">PPV</TableHead>
                        <TableHead className="w-16 px-1 text-xs leading-tight whitespace-normal text-right">
                          Total ligne
                        </TableHead>
                        <TableHead className="w-8 px-1 text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={showLineDiscount ? 9 : 8}
                            className="text-center text-muted-foreground"
                          >
                            Aucun produit sélectionné. Ajoutez depuis la recherche ci-dessus ou
                            scannez un code-barres.
                          </TableCell>
                        </TableRow>
                      ) : (
                        lines.map((line) => {
                          const selectedProduct = line.productId
                            ? (productMapById.get(line.productId) ??
                              productMapByName.get(line.product))
                            : productMapByName.get(line.product)
                          const lineTotals = getLineTotals(line, selectedProduct)
                          const lotQuantityTotal = (line.lots ?? []).reduce(
                            (sum, lot) => sum + lot.quantity,
                            0
                          )
                          return (
                            <React.Fragment key={line.id}>
                              <TableRow>
                                <TableCell
                                  className={
                                    showLineDiscount
                                      ? "w-48 min-w-0 text-left"
                                      : "w-56 min-w-0 text-left"
                                  }
                                >
                                  <span className="block rounded-md bg-popover px-2.5 py-1.5">
                                    {line.product}
                                  </span>
                                </TableCell>
                                <TableCell className="w-16 px-1 text-left">
                                  <Input
                                    aria-label="Quantité"
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={line.quantity}
                                    className="bg-popover"
                                    onChange={(event) =>
                                      updateLine(line.id, {
                                        quantity: parseNumber(event.target.value),
                                      })
                                    }
                                  />
                                </TableCell>
                                {showLineDiscount ? (
                                  <TableCell className="w-32 px-1 text-left">
                                    <ButtonGroup className="w-full">
                                      <Select
                                        value={line.discountType}
                                        onValueChange={(value) =>
                                          updateLine(line.id, {
                                            discountType: value as DiscountType,
                                          })
                                        }
                                      >
                                        <SelectTrigger
                                          className={`${dropdownTriggerBaseClassName} w-20`}
                                        >
                                          <SelectValue>
                                            {(value) =>
                                              (value as DiscountType) === "amount" ? "Montant" : "%"
                                            }
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
                                        aria-label="Valeur remise ligne"
                                        type="number"
                                        min="0"
                                        value={line.discountValue}
                                        className="bg-popover"
                                        onChange={(event) =>
                                          updateLine(line.id, {
                                            discountValue: parseNumber(event.target.value),
                                          })
                                        }
                                      />
                                    </ButtonGroup>
                                  </TableCell>
                                ) : null}
                                <TableCell className="w-12 px-1 text-right text-sm text-foreground">
                                  {formatCurrency(lineTotals.unitPrice)}
                                </TableCell>
                                <TableCell className="w-12 px-1 text-right text-sm text-foreground">
                                  {formatCurrency(lineTotals.subtotalHt)}
                                </TableCell>
                                <TableCell className="w-10 px-1 text-right text-sm text-foreground">
                                  {lineTotals.vatRate}%
                                </TableCell>
                                <TableCell className="w-12 px-1 text-right text-sm text-foreground">
                                  {formatCurrency(lineTotals.unitPriceTtc)}
                                </TableCell>
                                <TableCell className="w-16 px-1 text-right text-sm font-semibold text-foreground">
                                  {formatCurrency(lineTotals.total)}
                                </TableCell>
                                <TableCell className="w-8 px-1 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Supprimer la ligne"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveLine(line.id)}
                                    disabled={!canManagePurchases}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                              {isDelivery ? (
                                <TableRow>
                                  <TableCell colSpan={showLineDiscount ? 9 : 8} className="py-2">
                                    <div className="rounded-md border border-dashed p-3">
                                      <div className="mb-2 flex items-center justify-between">
                                        <p className="text-xs font-medium">Lots de réception</p>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => addLotToLine(line.id)}
                                          disabled={!canManagePurchases}
                                        >
                                          Ajouter lot
                                        </Button>
                                      </div>
                                      {(line.lots ?? []).length === 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                          Aucun lot saisi pour cette ligne.
                                        </p>
                                      ) : (
                                        <div className="space-y-2">
                                          {(line.lots ?? []).map((lot) => (
                                            <div
                                              key={lot.id}
                                              className="grid gap-2 md:grid-cols-4 md:items-end"
                                            >
                                              <div className="grid gap-1">
                                                <Label className="text-xs">N° lot</Label>
                                                <Input
                                                  aria-label="Numéro de lot"
                                                  value={lot.lotNumber}
                                                  placeholder="LOT-001"
                                                  className="bg-popover"
                                                  onChange={(event) =>
                                                    updateLot(line.id, lot.id, {
                                                      lotNumber: event.target.value,
                                                    })
                                                  }
                                                />
                                              </div>
                                              <div className="grid gap-1">
                                                <Label className="text-xs">Expiration</Label>
                                                <Input
                                                  aria-label="Date d'expiration lot"
                                                  type="date"
                                                  value={lot.expiryDate}
                                                  className="bg-popover"
                                                  onChange={(event) =>
                                                    updateLot(line.id, lot.id, {
                                                      expiryDate: event.target.value,
                                                    })
                                                  }
                                                />
                                              </div>
                                              <div className="grid gap-1">
                                                <Label className="text-xs">Quantité lot</Label>
                                                <Input
                                                  aria-label="Quantité lot"
                                                  type="number"
                                                  min="0"
                                                  value={lot.quantity}
                                                  className="bg-popover"
                                                  onChange={(event) =>
                                                    updateLot(line.id, lot.id, {
                                                      quantity: parseNumber(event.target.value),
                                                    })
                                                  }
                                                />
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Supprimer le lot"
                                                className="text-destructive hover:text-destructive md:justify-self-end"
                                                onClick={() => removeLot(line.id, lot.id)}
                                                disabled={!canManagePurchases}
                                              >
                                                <Trash2 className="size-4" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        Total lots: {lotQuantityTotal} / Quantité ligne:{" "}
                                        {line.quantity}
                                      </p>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : null}
                            </React.Fragment>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              {showGlobalDiscount ? (
                <div className="space-y-3 pt-1">
                  <Label>Remise</Label>
                  <ButtonGroup className="w-full">
                    <Select
                      value={globalDiscountType}
                      onValueChange={(value) => setGlobalDiscountType(value as DiscountType)}
                    >
                      <SelectTrigger className={`${dropdownTriggerBaseClassName} w-24`}>
                        <SelectValue placeholder="Valeur">
                          {(value) => (isPercentDiscount(value as DiscountType) ? "%" : "Montant")}
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
                      placeholder="Valeur"
                      value={globalDiscountValue}
                      className="bg-popover"
                      onChange={(event) => setGlobalDiscountValue(parseNumber(event.target.value))}
                    />
                  </ButtonGroup>
                </div>
              ) : null}
              <div className="rounded-lg border border-border p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Nombre de lignes</span>
                    <span className="text-foreground">{totalLines}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Nombre de produits</span>
                    <span className="text-foreground">{totalProducts}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Total PPH</span>
                    <span className="text-foreground">{formatCurrency(totalHt)} MAD</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Total PPV</span>
                    <span className="text-foreground">{formatCurrency(totalTtc)} MAD</span>
                  </div>
                  {showGlobalDiscount ? (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Remise</span>
                      <span className="text-foreground">{formatCurrency(totalDiscount)} MAD</span>
                    </div>
                  ) : null}
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total de la commande</span>
                  <span>{formatCurrency(totalOrder)} MAD</span>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              type="button"
              disabled={!canManagePurchases}
              onClick={() => submitWithStatus("Brouillon")}
            >
              Enregistrer en brouillon
            </Button>
            <Button type="submit" disabled={!canManagePurchases}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalForm>
      </ModalContent>
    </Modal>
  )
}
