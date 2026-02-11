"use client"

import * as React from "react"
import { ChevronDown, ChevronUp, Plus, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
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

import {
  type ProductSearchFilters,
  type ProductSearchItem,
  type ProductSearchStockFilter,
  filterProductsByFilters,
  getProductStockStatus,
} from "@/features/products/product-search-utils"
import { cn } from "@/lib/utils"

type ProductSearchPanelProps<TProduct extends ProductSearchItem> = {
  products: TProduct[]
  onAddProduct: (product: TProduct) => void
  contextLabel: string
}

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const INITIAL_FILTERS: ProductSearchFilters = {
  nameQuery: "",
  barcodeQuery: "",
  category: "",
  minPpv: "",
  maxPpv: "",
  stockFilter: "all",
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function getStockBadgeVariant(stockFilter: ProductSearchStockFilter) {
  if (stockFilter === "in-stock") return "success"
  if (stockFilter === "low-stock") return "warning"
  if (stockFilter === "out-of-stock") return "destructive"
  return "secondary"
}

function getStockFilterLabel(stockFilter: ProductSearchStockFilter) {
  if (stockFilter === "in-stock") return "En stock"
  if (stockFilter === "low-stock") return "Stock bas"
  if (stockFilter === "out-of-stock") return "Rupture"
  return "Tous"
}

export function ProductSearchPanel<TProduct extends ProductSearchItem>({
  products,
  onAddProduct,
  contextLabel,
}: ProductSearchPanelProps<TProduct>) {
  const [filters, setFilters] = React.useState<ProductSearchFilters>(INITIAL_FILTERS)
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const contextId = React.useMemo(
    () => contextLabel.toLocaleLowerCase("fr").replace(/\s+/g, "-"),
    [contextLabel]
  )

  const categories = React.useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.category))).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [products]
  )

  const filteredProducts = React.useMemo(
    () => filterProductsByFilters(products, filters),
    [filters, products]
  )
  const hasSearchQuery = Boolean(filters.nameQuery.trim()) || Boolean(filters.barcodeQuery.trim())
  const visibleProducts = React.useMemo(
    () => (hasSearchQuery ? filteredProducts : []),
    [filteredProducts, hasSearchQuery]
  )

  React.useEffect(() => {
    if (visibleProducts.length === 0) {
      setHighlightedIndex(0)
      return
    }
    if (highlightedIndex > visibleProducts.length - 1) {
      setHighlightedIndex(0)
    }
  }, [visibleProducts.length, highlightedIndex])

  const hasActiveFilters =
    Boolean(filters.nameQuery) ||
    Boolean(filters.barcodeQuery) ||
    Boolean(filters.category) ||
    Boolean(filters.minPpv) ||
    Boolean(filters.maxPpv) ||
    filters.stockFilter !== "all"

  const handleAddHighlightedProduct = React.useCallback(() => {
    if (!hasSearchQuery) {
      return
    }
    const selected = visibleProducts[highlightedIndex] ?? visibleProducts[0]
    if (!selected) return
    onAddProduct(selected)
  }, [hasSearchQuery, highlightedIndex, onAddProduct, visibleProducts])

  const handleQueryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      if (!hasSearchQuery) {
        return
      }
      event.preventDefault()
      setHighlightedIndex((current) =>
        visibleProducts.length === 0 ? 0 : Math.min(visibleProducts.length - 1, current + 1)
      )
      return
    }
    if (event.key === "ArrowUp") {
      if (!hasSearchQuery) {
        return
      }
      event.preventDefault()
      setHighlightedIndex((current) => Math.max(0, current - 1))
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      handleAddHighlightedProduct()
    }
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-accent/30 via-card to-secondary/40">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">Recherche produit rapide</CardTitle>
            <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md border border-border bg-popover px-2.5 py-1.5 transition-colors">
              {isExpanded ? (
                <>
                  <ChevronUp className="size-3.5" />
                  Masquer la recherche
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" />
                  Afficher la recherche
                </>
              )}
            </CollapsibleTrigger>
          </div>
          <p className="text-xs text-muted-foreground">
            Recherchez par nom, code-barres, catégorie, PPV ou stock puis ajoutez au document{" "}
            {contextLabel}. Le scan code-barres ajoute directement aux lignes sélectionnées.
          </p>
          <div className="flex items-center justify-end">
            {isExpanded ? (
              <Badge variant="success">
                {visibleProducts.length} résultat{visibleProducts.length > 1 ? "s" : ""}
              </Badge>
            ) : null}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="grid gap-2 xl:col-span-2">
                <Label htmlFor={`search-name-${contextId}`}>Nom</Label>
                <Input
                  id={`search-name-${contextId}`}
                  value={filters.nameQuery}
                  placeholder="Nom du produit"
                  className="bg-popover"
                  onKeyDown={handleQueryKeyDown}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, nameQuery: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`search-barcode-${contextId}`}>Code-barres</Label>
                <Input
                  id={`search-barcode-${contextId}`}
                  value={filters.barcodeQuery}
                  placeholder="Code-barres (recherche manuelle)"
                  className="bg-popover"
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, barcodeQuery: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Catégorie</Label>
                <Select
                  value={filters.category || "all"}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      category: !value || value === "all" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full bg-popover">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`search-min-ppv-${contextId}`}>PPV min</Label>
                <Input
                  id={`search-min-ppv-${contextId}`}
                  type="number"
                  min={0}
                  value={filters.minPpv}
                  placeholder="0"
                  className="bg-popover"
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, minPpv: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`search-max-ppv-${contextId}`}>PPV max</Label>
                <Input
                  id={`search-max-ppv-${contextId}`}
                  type="number"
                  min={0}
                  value={filters.maxPpv}
                  placeholder="500"
                  className="bg-popover"
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, maxPpv: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Stock</Label>
                <Select
                  value={filters.stockFilter}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      stockFilter: value as ProductSearchStockFilter,
                    }))
                  }
                >
                  <SelectTrigger className="w-full bg-popover">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="in-stock">En stock</SelectItem>
                    <SelectItem value="low-stock">Stock bas</SelectItem>
                    <SelectItem value="out-of-stock">Rupture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters ? (
              <div className="flex flex-wrap items-center gap-2">
                {filters.nameQuery ? (
                  <Badge variant="outline" className="gap-2 pr-1">
                    Nom: {filters.nameQuery}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-4"
                      aria-label="Retirer le filtre nom"
                      onClick={() => setFilters((current) => ({ ...current, nameQuery: "" }))}
                    >
                      <X className="size-3" />
                    </Button>
                  </Badge>
                ) : null}
                {filters.barcodeQuery ? (
                  <Badge variant="outline" className="gap-2 pr-1">
                    Code: {filters.barcodeQuery}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-4"
                      aria-label="Retirer le filtre code-barres"
                      onClick={() => setFilters((current) => ({ ...current, barcodeQuery: "" }))}
                    >
                      <X className="size-3" />
                    </Button>
                  </Badge>
                ) : null}
                {filters.category ? (
                  <Badge variant="outline" className="gap-2 pr-1">
                    Catégorie: {filters.category}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-4"
                      aria-label="Retirer le filtre catégorie"
                      onClick={() => setFilters((current) => ({ ...current, category: "" }))}
                    >
                      <X className="size-3" />
                    </Button>
                  </Badge>
                ) : null}
                {filters.minPpv ? (
                  <Badge variant="outline" className="gap-2 pr-1">
                    PPV min: {filters.minPpv}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-4"
                      aria-label="Retirer le filtre PPV min"
                      onClick={() => setFilters((current) => ({ ...current, minPpv: "" }))}
                    >
                      <X className="size-3" />
                    </Button>
                  </Badge>
                ) : null}
                {filters.maxPpv ? (
                  <Badge variant="outline" className="gap-2 pr-1">
                    PPV max: {filters.maxPpv}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-4"
                      aria-label="Retirer le filtre PPV max"
                      onClick={() => setFilters((current) => ({ ...current, maxPpv: "" }))}
                    >
                      <X className="size-3" />
                    </Button>
                  </Badge>
                ) : null}
                {filters.stockFilter !== "all" ? (
                  <Badge variant="outline" className="gap-2 pr-1">
                    Stock: {getStockFilterLabel(filters.stockFilter)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-4"
                      aria-label="Retirer le filtre stock"
                      onClick={() => setFilters((current) => ({ ...current, stockFilter: "all" }))}
                    >
                      <X className="size-3" />
                    </Button>
                  </Badge>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(INITIAL_FILTERS)}
                >
                  Réinitialiser
                </Button>
              </div>
            ) : null}

            <div className="rounded-lg border border-border bg-card">
              <div className="no-scrollbar max-h-48 overflow-auto">
                {visibleProducts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Code-barres</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>PPV</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleProducts.map((product, index) => {
                        const stockStatus = getProductStockStatus(product)
                        return (
                          <TableRow
                            key={product.id}
                            aria-selected={index === highlightedIndex}
                            className={cn(index === highlightedIndex ? "bg-muted/50" : undefined)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                          >
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.barcode || "Sans code barre"}</TableCell>
                            <TableCell>{product.category || "-"}</TableCell>
                            <TableCell>{formatCurrency(product.sellingPrice)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={getStockBadgeVariant(
                                  stockStatus === "En stock"
                                    ? "in-stock"
                                    : stockStatus === "Stock bas"
                                      ? "low-stock"
                                      : "out-of-stock"
                                )}
                              >
                                {stockStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => onAddProduct(product)}
                              >
                                <Plus className="size-4" />
                                Ajouter
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <Empty className="rounded-none border-0 bg-transparent">
                    <EmptyHeader>
                      <div className="rounded-lg bg-muted p-2">
                        <Search className="size-4 text-muted-foreground" />
                      </div>
                      {hasSearchQuery ? (
                        <>
                          <EmptyTitle>Aucun produit trouvé</EmptyTitle>
                          <EmptyDescription>
                            Vérifiez les filtres de code-barres et de catégorie, puis élargissez la
                            plage PPV si nécessaire.
                          </EmptyDescription>
                        </>
                      ) : (
                        <>
                          <EmptyTitle>Commencez par saisir une recherche</EmptyTitle>
                          <EmptyDescription>
                            Entrez un nom ou un code-barres pour afficher la liste des produits. Le
                            scan ajoute directement aux lignes, sans passer par cette liste.
                          </EmptyDescription>
                        </>
                      )}
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Entrée: ajoute le produit surligné.</span>
              <span>Flèches haut/bas: navigation rapide. Scan: ajout direct aux lignes.</span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
