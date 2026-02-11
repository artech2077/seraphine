"use client"

import * as React from "react"
import Link from "next/link"

import { ContentCard } from "@/components/layout/content-card"
import { PageShell } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useExpiryRiskAlerts,
  useInventoryItems,
  useLotTraceabilityReport,
  type ExpiryRiskSeverity,
  type ExpiryRiskWindow,
} from "@/features/inventaire/api"
import { StockAdjustmentModal } from "@/features/inventaire/stock-adjustment-modal"
import type { StockAdjustmentValues } from "@/features/inventaire/api"
import { StocktakeManagementCard } from "@/features/inventaire/stocktake-management-card"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { toast } from "sonner"

type AlertSeverity = "RUPTURE" | "STOCK_BAS"

type AlertItem = {
  id: string
  name: string
  stock: number
  threshold: number
  severity: AlertSeverity
}

function getSeverityLevel(severity: AlertSeverity) {
  if (severity === "RUPTURE") return 2
  return 1
}

function toCsvValue(value: string | number) {
  const normalized = String(value).replaceAll('"', '""')
  return `"${normalized}"`
}

function getExpirySeverityLabel(severity: ExpiryRiskSeverity) {
  if (severity === "EXPIRED") return "Expire"
  if (severity === "CRITICAL") return "Critique (<=30j)"
  if (severity === "WARNING") return "Alerte (<=60j)"
  return "Surveillance (<=90j)"
}

function getExpirySeverityBadgeVariant(severity: ExpiryRiskSeverity) {
  if (severity === "EXPIRED" || severity === "CRITICAL") {
    return "destructive" as const
  }
  if (severity === "WARNING") {
    return "warning" as const
  }
  return "secondary" as const
}

function formatExpiryDate(value: number) {
  return new Date(value).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function StockManagementPage() {
  const { items, isLoading, hasOrg, adjustStock } = useInventoryItems()
  const { canManage, canView } = useRoleAccess()
  const canViewInventory = canView("inventaire")
  const canManageInventory = canManage("inventaire")
  const [adjustmentOpen, setAdjustmentOpen] = React.useState(false)
  const [adjustmentProductId, setAdjustmentProductId] = React.useState<string | undefined>(
    undefined
  )
  const [alertQuery, setAlertQuery] = React.useState("")
  const [severityFilter, setSeverityFilter] = React.useState<"ALL" | AlertSeverity>("ALL")
  const [sortBy, setSortBy] = React.useState<"SEVERITY" | "PRODUCT">("SEVERITY")
  const [sortOrder, setSortOrder] = React.useState<"ASC" | "DESC">("DESC")
  const [expiryWindow, setExpiryWindow] = React.useState<ExpiryRiskWindow>(90)
  const [expiryProductId, setExpiryProductId] = React.useState<string>("ALL")
  const [expiryCategory, setExpiryCategory] = React.useState<string>("ALL")
  const [expirySupplierId, setExpirySupplierId] = React.useState<string>("ALL")
  const [expirySeverity, setExpirySeverity] = React.useState<"ALL" | ExpiryRiskSeverity>("ALL")
  const [lotSearchInput, setLotSearchInput] = React.useState("")
  const [activeLotSearch, setActiveLotSearch] = React.useState("")

  const expiryFilters = React.useMemo(
    () => ({
      productIds: expiryProductId === "ALL" ? [] : [expiryProductId],
      categories: expiryCategory === "ALL" ? [] : [expiryCategory],
      supplierIds: expirySupplierId === "ALL" ? [] : [expirySupplierId],
      severities: expirySeverity === "ALL" ? [] : [expirySeverity],
    }),
    [expiryCategory, expiryProductId, expirySeverity, expirySupplierId]
  )

  const {
    items: expiryRiskItems,
    counts: expiryRiskCounts,
    filterOptions: expiryFilterOptions,
    isLoading: isExpiryRiskLoading,
    isUnavailable: isExpiryRiskUnavailable,
  } = useExpiryRiskAlerts({
    windowDays: expiryWindow,
    filters: expiryFilters,
  })
  const {
    lotNumber: searchedLotNumber,
    items: lotTraceabilityItems,
    isLoading: isLotTraceabilityLoading,
    isUnavailable: isLotTraceabilityUnavailable,
  } = useLotTraceabilityReport(activeLotSearch)

  const outOfStockItems = React.useMemo(() => items.filter((item) => item.stock === 0), [items])
  const lowStockItems = React.useMemo(
    () => items.filter((item) => item.stock > 0 && item.stock <= item.threshold),
    [items]
  )
  const alertItems = React.useMemo<AlertItem[]>(
    () =>
      items
        .filter((item) => item.stock <= item.threshold)
        .map(
          (item): AlertItem => ({
            id: item.id,
            name: item.name,
            stock: item.stock,
            threshold: item.threshold,
            severity: item.stock === 0 ? "RUPTURE" : "STOCK_BAS",
          })
        ),
    [items]
  )
  const filteredAlerts = React.useMemo(() => {
    const normalizedQuery = alertQuery.trim().toLocaleLowerCase("fr")
    const filtered = alertItems.filter((item) => {
      if (severityFilter !== "ALL" && item.severity !== severityFilter) {
        return false
      }
      if (!normalizedQuery) {
        return true
      }
      return item.name.toLocaleLowerCase("fr").includes(normalizedQuery)
    })

    const sorted = [...filtered].sort((left, right) => {
      if (sortBy === "SEVERITY") {
        const severityDiff = getSeverityLevel(left.severity) - getSeverityLevel(right.severity)
        if (severityDiff !== 0) {
          return severityDiff
        }
        return left.name.localeCompare(right.name, "fr")
      }
      return left.name.localeCompare(right.name, "fr")
    })

    if (sortOrder === "DESC") {
      sorted.reverse()
    }

    return sorted
  }, [alertItems, alertQuery, severityFilter, sortBy, sortOrder])

  const handleAdjustStock = React.useCallback(
    async (values: StockAdjustmentValues) => {
      await adjustStock(values)
    },
    [adjustStock]
  )
  const handleOpenAdjustment = React.useCallback((productId?: string) => {
    setAdjustmentProductId(productId)
    setAdjustmentOpen(true)
  }, [])
  const handleExportAlerts = React.useCallback(() => {
    if (filteredAlerts.length === 0) {
      toast.error("Aucune alerte à exporter.")
      return
    }

    const header = ["Produit", "Statut", "Stock", "Seuil"]
    const rows = filteredAlerts.map((item) => [
      item.name,
      item.severity === "RUPTURE" ? "Rupture" : "Stock bas",
      item.stock,
      item.threshold,
    ])

    const csv = [header, ...rows]
      .map((columns) => columns.map((column) => toCsvValue(column)).join(";"))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "alertes-stock.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [filteredAlerts])

  const handleExportExpiryRisk = React.useCallback(() => {
    if (expiryRiskItems.length === 0) {
      toast.error("Aucun risque d'expiration a exporter.")
      return
    }

    const header = [
      "Produit",
      "Categorie",
      "Lot",
      "Expiration",
      "Jours restants",
      "Quantite",
      "Fournisseur",
      "Severite",
      "Action recommandee",
      "Lien lot",
      "Lien action",
    ]

    const rows = expiryRiskItems.map((item) => [
      item.productName,
      item.productCategory,
      item.lotNumber,
      formatExpiryDate(item.expiryDate),
      item.daysToExpiry,
      item.quantity,
      item.supplierName ?? "-",
      getExpirySeverityLabel(item.severity),
      item.recommendedAction,
      item.lotDetailPath,
      item.recommendedPathHref,
    ])

    const csv = [header, ...rows]
      .map((columns) => columns.map((column) => toCsvValue(column)).join(";"))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "risques-expiration.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [expiryRiskItems])

  const handleSearchLotTraceability = React.useCallback(() => {
    const normalized = lotSearchInput.trim().toUpperCase()
    if (!normalized) {
      toast.error("Renseignez un numero de lot.")
      return
    }
    setActiveLotSearch(normalized)
  }, [lotSearchInput])

  const handleExportRecallReport = React.useCallback(() => {
    if (lotTraceabilityItems.length === 0) {
      toast.error("Aucun rapport de lot a exporter.")
      return
    }

    const header = [
      "Lot",
      "Produit",
      "Categorie",
      "Expiration",
      "Fournisseur",
      "Recu",
      "Vendu",
      "Solde courant",
      "Type mouvement",
      "Delta",
      "Date",
      "Reference",
      "Motif",
    ]

    const rows = lotTraceabilityItems.flatMap((item) =>
      item.timeline.map((event) => [
        item.lotNumber,
        item.productName,
        item.productCategory,
        formatExpiryDate(item.expiryDate),
        item.supplierName ?? "-",
        item.receivedQuantity,
        item.soldQuantity,
        item.currentBalance,
        event.eventType,
        event.delta,
        new Date(event.createdAt).toLocaleString("fr-FR"),
        event.reference,
        event.reason,
      ])
    )

    const csv = [header, ...rows]
      .map((columns) => columns.map((column) => toCsvValue(column)).join(";"))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `rapport-rappel-${searchedLotNumber || "lot"}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [lotTraceabilityItems, searchedLotNumber])

  return (
    <PageShell
      title="Inventaire"
      description="Surveillez les alertes stock et préparez les prochaines actions de réapprovisionnement."
      actions={
        <>
          <Button
            disabled={!hasOrg || isLoading || items.length === 0 || !canManageInventory}
            variant="default"
            onClick={() => handleOpenAdjustment(undefined)}
          >
            Ajuster stock
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/app/produit" />}>
            Gérer les produits
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <ContentCard title="Produits suivis" contentClassName="text-2xl font-semibold">
          {isLoading ? <Skeleton className="h-8 w-20" /> : items.length}
        </ContentCard>
        <ContentCard title="Stock bas" contentClassName="text-2xl font-semibold">
          {isLoading ? <Skeleton className="h-8 w-20" /> : lowStockItems.length}
        </ContentCard>
        <ContentCard title="Ruptures" contentClassName="text-2xl font-semibold">
          {isLoading ? <Skeleton className="h-8 w-20" /> : outOfStockItems.length}
        </ContentCard>
      </div>

      <ContentCard
        title="Alertes opérationnelles"
        description="Vue dédiée aux ruptures et stocks bas pour prioriser les réapprovisionnements."
      >
        {!hasOrg ? (
          <p className="text-muted-foreground">
            Sélectionnez une pharmacie pour afficher les données d&apos;inventaire.
          </p>
        ) : null}

        {hasOrg && isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={`inventory-management-row-${index}`} className="h-8 w-full" />
            ))}
          </div>
        ) : null}

        {hasOrg && !isLoading && alertItems.length === 0 ? (
          <p className="text-muted-foreground">
            Aucun produit n&apos;est actuellement sous son seuil.
          </p>
        ) : null}

        {hasOrg && !isLoading && alertItems.length > 0 ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-sm">Section Ruptures</p>
                <p className="text-2xl font-semibold tabular-nums">{outOfStockItems.length}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-sm">Section Stock bas</p>
                <p className="text-2xl font-semibold tabular-nums">{lowStockItems.length}</p>
              </div>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-4">
              <div className="grid gap-2 lg:col-span-2">
                <Label htmlFor="alert-product-search">Produit</Label>
                <Input
                  id="alert-product-search"
                  placeholder="Rechercher un produit"
                  value={alertQuery}
                  onChange={(event) => setAlertQuery(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alert-severity-filter">Sévérité</Label>
                <Select
                  value={severityFilter}
                  onValueChange={(value) =>
                    setSeverityFilter((value as "ALL" | AlertSeverity) ?? "ALL")
                  }
                >
                  <SelectTrigger id="alert-severity-filter" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes</SelectItem>
                    <SelectItem value="RUPTURE">Rupture</SelectItem>
                    <SelectItem value="STOCK_BAS">Stock bas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alert-sort">Tri</Label>
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onValueChange={(value) => {
                    if (!value) {
                      return
                    }
                    const [nextSortBy, nextSortOrder] = value.split("-")
                    setSortBy(nextSortBy as "SEVERITY" | "PRODUCT")
                    setSortOrder(nextSortOrder as "ASC" | "DESC")
                  }}
                >
                  <SelectTrigger id="alert-sort" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEVERITY-DESC">Sévérité (haut vers bas)</SelectItem>
                    <SelectItem value="SEVERITY-ASC">Sévérité (bas vers haut)</SelectItem>
                    <SelectItem value="PRODUCT-ASC">Produit (A-Z)</SelectItem>
                    <SelectItem value="PRODUCT-DESC">Produit (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleExportAlerts}>
                Exporter alertes
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Seuil</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.threshold}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.stock}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.severity === "RUPTURE" ? "destructive" : "warning"}>
                        {item.severity === "RUPTURE" ? "Rupture" : "Stock bas"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/app/produit?productId=${item.id}`} />}
                        >
                          Voir produit
                        </Button>
                        <Button
                          size="sm"
                          disabled={!canManageInventory}
                          onClick={() => handleOpenAdjustment(item.id)}
                        >
                          Ajuster
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredAlerts.length === 0 ? (
              <p className="text-muted-foreground mt-3">Aucune alerte ne correspond aux filtres.</p>
            ) : null}
          </>
        ) : null}
      </ContentCard>

      <ContentCard
        title="Risques d'expiration (lots)"
        description="Reperez les lots a risque sur 30/60/90 jours, appliquez les filtres et declenchez l'action recommandee."
      >
        {!hasOrg ? (
          <p className="text-muted-foreground">
            Sélectionnez une pharmacie pour afficher les risques d&apos;expiration.
          </p>
        ) : null}

        {hasOrg && isExpiryRiskUnavailable ? (
          <p className="text-muted-foreground">
            Les requêtes d&apos;expiration ne sont pas encore disponibles côté Convex. Lancez{" "}
            <code>npx convex dev</code> ou <code>npx convex deploy</code> puis rechargez la page.
          </p>
        ) : null}

        {hasOrg && isExpiryRiskLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`inventory-expiry-row-${index}`} className="h-8 w-full" />
            ))}
          </div>
        ) : null}

        {hasOrg && !isExpiryRiskLoading ? (
          <>
            <div className="mb-4 grid gap-3 md:grid-cols-5">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-sm">Lots a risque</p>
                <p className="text-2xl font-semibold tabular-nums">{expiryRiskCounts.total}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-sm">Expirés</p>
                <p className="text-2xl font-semibold tabular-nums">{expiryRiskCounts.expired}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-sm">Jusqu&apos;a 30 jours</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {expiryRiskCounts.dueIn30Days}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-sm">Jusqu&apos;a 60 jours</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {expiryRiskCounts.dueIn60Days}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-sm">Jusqu&apos;a 90 jours</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {expiryRiskCounts.dueIn90Days}
                </p>
              </div>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-5">
              <div className="grid gap-2">
                <Label htmlFor="expiry-window-filter">Fenetre</Label>
                <Select
                  value={String(expiryWindow)}
                  onValueChange={(value) => {
                    if (value === "30" || value === "60" || value === "90") {
                      setExpiryWindow(Number(value) as ExpiryRiskWindow)
                    }
                  }}
                >
                  <SelectTrigger id="expiry-window-filter" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="60">60 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiry-product-filter">Produit</Label>
                <Select
                  value={expiryProductId}
                  onValueChange={(value) => setExpiryProductId(value ?? "ALL")}
                >
                  <SelectTrigger id="expiry-product-filter" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous les produits</SelectItem>
                    {expiryFilterOptions.products.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiry-category-filter">Categorie</Label>
                <Select
                  value={expiryCategory}
                  onValueChange={(value) => setExpiryCategory(value ?? "ALL")}
                >
                  <SelectTrigger id="expiry-category-filter" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes les categories</SelectItem>
                    {expiryFilterOptions.categories.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiry-supplier-filter">Fournisseur</Label>
                <Select
                  value={expirySupplierId}
                  onValueChange={(value) => setExpirySupplierId(value ?? "ALL")}
                >
                  <SelectTrigger id="expiry-supplier-filter" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous les fournisseurs</SelectItem>
                    {expiryFilterOptions.suppliers.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiry-severity-filter">Severite</Label>
                <Select
                  value={expirySeverity}
                  onValueChange={(value) =>
                    setExpirySeverity((value as "ALL" | ExpiryRiskSeverity) ?? "ALL")
                  }
                >
                  <SelectTrigger id="expiry-severity-filter" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes</SelectItem>
                    {expiryFilterOptions.severities.map((option) => (
                      <SelectItem key={option} value={option}>
                        {getExpirySeverityLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleExportExpiryRisk}>
                Exporter risques expiration
              </Button>
            </div>

            {expiryRiskItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead className="text-right">Jours</TableHead>
                    <TableHead className="text-right">Quantite</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Severite</TableHead>
                    <TableHead>Action recommandee</TableHead>
                    <TableHead className="text-right">Liens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiryRiskItems.map((item) => (
                    <TableRow key={item.lotId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.lotNumber}</TableCell>
                      <TableCell>{formatExpiryDate(item.expiryDate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.daysToExpiry}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell>{item.productCategory}</TableCell>
                      <TableCell>{item.supplierName ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getExpirySeverityBadgeVariant(item.severity)}>
                          {getExpirySeverityLabel(item.severity)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm">{item.recommendedAction}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={<Link href={item.lotDetailPath} />}
                          >
                            Voir lot
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            nativeButton={false}
                            render={<Link href={item.recommendedPathHref} />}
                          >
                            {item.recommendedPathLabel}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Aucun lot ne correspond aux filtres actifs.</p>
            )}
          </>
        ) : null}
      </ContentCard>

      <ContentCard
        title="Traçabilité lot et rapport de rappel"
        description="Recherchez un numero de lot pour visualiser la chronologie complete des mouvements et exporter un rapport de rappel."
      >
        {!hasOrg ? (
          <p className="text-muted-foreground">
            Sélectionnez une pharmacie pour activer la recherche de traçabilité.
          </p>
        ) : !canViewInventory ? (
          <p className="text-muted-foreground">
            Vous n&apos;avez pas les droits necessaires pour consulter la traçabilité des lots.
          </p>
        ) : (
          <>
            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <div className="grid gap-2">
                <Label htmlFor="lot-traceability-search">Numero de lot</Label>
                <Input
                  id="lot-traceability-search"
                  value={lotSearchInput}
                  onChange={(event) => setLotSearchInput(event.target.value.toUpperCase())}
                  placeholder="Ex: LOT-001"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearchLotTraceability}>Rechercher lot</Button>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={handleExportRecallReport}
                  disabled={!canManageInventory || lotTraceabilityItems.length === 0}
                >
                  Exporter rapport rappel
                </Button>
              </div>
            </div>

            {!activeLotSearch ? (
              <p className="text-muted-foreground">
                Saisissez un numero de lot pour afficher son historique de réception et de vente.
              </p>
            ) : null}

            {activeLotSearch && isLotTraceabilityUnavailable ? (
              <p className="text-muted-foreground">
                Le rapport de traçabilité lot n&apos;est pas encore disponible côté Convex. Lancez{" "}
                <code>npx convex dev</code> ou <code>npx convex deploy</code>.
              </p>
            ) : null}

            {activeLotSearch && isLotTraceabilityLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`lot-traceability-row-${index}`} className="h-8 w-full" />
                ))}
              </div>
            ) : null}

            {activeLotSearch && !isLotTraceabilityLoading && lotTraceabilityItems.length === 0 ? (
              <p className="text-muted-foreground">
                Aucun mouvement trouve pour le lot {searchedLotNumber || activeLotSearch}.
              </p>
            ) : null}

            {activeLotSearch && !isLotTraceabilityLoading && lotTraceabilityItems.length > 0 ? (
              <div className="space-y-4">
                {lotTraceabilityItems.map((item) => (
                  <div key={item.lotId} className="space-y-3 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {item.productName} · {item.lotNumber}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Expire le {formatExpiryDate(item.expiryDate)} · Fournisseur:{" "}
                          {item.supplierName ?? "-"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={item.recallReportPath} />}
                      >
                        Ouvrir contexte inventaire
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground text-xs">Quantite recue</p>
                        <p className="text-lg font-semibold tabular-nums">
                          {item.receivedQuantity}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground text-xs">Quantite vendue</p>
                        <p className="text-lg font-semibold tabular-nums">{item.soldQuantity}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground text-xs">Solde actuel</p>
                        <p className="text-lg font-semibold tabular-nums">{item.currentBalance}</p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Delta</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Motif</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.timeline.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              {new Date(event.createdAt).toLocaleString("fr-FR")}
                            </TableCell>
                            <TableCell>{event.eventType}</TableCell>
                            <TableCell className="text-right tabular-nums">{event.delta}</TableCell>
                            <TableCell>{event.reference}</TableCell>
                            <TableCell>{event.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </ContentCard>

      <StocktakeManagementCard />

      <StockAdjustmentModal
        open={adjustmentOpen}
        onOpenChange={setAdjustmentOpen}
        items={items}
        initialProductId={adjustmentProductId}
        onSubmit={handleAdjustStock}
      />
    </PageShell>
  )
}
