"use client"

import * as React from "react"

import { DataTable } from "@/components/data-table"
import { DataTableFooter } from "@/components/data-table-footer"
import { FilterMultiCombobox } from "@/components/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filter-multi-select"
import { FiltersBar } from "@/components/filters-bar"
import { InventoryProductModal } from "@/components/inventory-product-modal"
import { InventoryTable, type InventoryItem } from "@/components/inventory-table"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Download, Plus, Printer } from "lucide-react"

type InventoryPageProps = {
  items: InventoryItem[]
}

const STOCK_FILTER_LABELS = ["Tous", "En stock", "Stock bas", "Rupture"]
const VAT_FILTER_LABELS = ["Toutes", "0%", "7%", "20%"]

function getStockStatus(item: InventoryItem) {
  if (item.stock === 0) {
    return "Rupture"
  }
  if (item.stock <= item.threshold) {
    return "Stock bas"
  }
  return "En stock"
}

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ])

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
}

function toCsv(items: InventoryItem[]) {
  const header = [
    "Produit",
    "Stock",
    "Seuil",
    "Prix d'achat",
    "Prix de vente",
    "TVA",
    "Categorie",
    "Forme galenique",
    "Code barre",
  ]
  const rows = items.map((item) => [
    item.name,
    item.stock,
    item.threshold,
    item.purchasePrice,
    item.sellingPrice,
    `${item.vatRate}%`,
    item.category,
    item.dosageForm,
    item.barcode ?? "",
  ])

  return [header, ...rows]
    .map((row) =>
      row
        .map((value) => {
          const normalized = String(value ?? "")
          if (normalized.includes('"') || normalized.includes(",") || normalized.includes("\n")) {
            return `"${normalized.replace(/"/g, '""')}"`
          }
          return normalized
        })
        .join(",")
    )
    .join("\n")
}

export function InventoryPage({ items }: InventoryPageProps) {
  const [productFilter, setProductFilter] = React.useState<string[]>([])
  const [barcodeFilter, setBarcodeFilter] = React.useState<string[]>([])
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [stockFilter, setStockFilter] = React.useState<string[]>([])
  const [vatFilter, setVatFilter] = React.useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = React.useState<string[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)

  const pageSize = 5

  const productOptions = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.name))),
    [items]
  )
  const barcodeOptions = React.useMemo(() => {
    const barcodes = items
      .map((item) => item.barcode)
      .filter((barcode): barcode is string => Boolean(barcode))
    return Array.from(new Set([...barcodes, "Sans code barre"]))
  }, [items])
  const supplierOptions = React.useMemo(() => {
    const suppliers = items
      .map((item) => item.supplier)
      .filter((supplier): supplier is string => Boolean(supplier))
    return Array.from(new Set(suppliers))
  }, [items])
  const categoryOptions = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.category))),
    [items]
  )

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (productFilter.length > 0 && !productFilter.includes(item.name)) {
        return false
      }

      if (barcodeFilter.length > 0) {
        const hasBarcode = Boolean(item.barcode)
        const matchBarcode = item.barcode
          ? barcodeFilter.includes(item.barcode)
          : false
        const wantsMissing = barcodeFilter.includes("Sans code barre")
        if (!matchBarcode && !(wantsMissing && !hasBarcode)) {
          return false
        }
      }

      if (supplierFilter.length > 0 && !supplierFilter.includes(item.supplier ?? "")) {
        return false
      }

      if (categoryFilter.length > 0 && !categoryFilter.includes(item.category)) {
        return false
      }

      if (stockFilter.length > 0 && !stockFilter.includes("Tous")) {
        const status = getStockStatus(item)
        if (!stockFilter.includes(status)) {
          return false
        }
      }

      if (vatFilter.length > 0 && !vatFilter.includes("Toutes")) {
        const selectedRates = vatFilter.map((rate) => Number(rate.replace("%", "")))
        if (!selectedRates.includes(item.vatRate)) {
          return false
        }
      }

      return true
    })
  }, [items, productFilter, barcodeFilter, supplierFilter, stockFilter, vatFilter, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const rangeStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(filteredItems.length, currentPage * pageSize)
  const rangeLabel =
    filteredItems.length === 0
      ? "0 sur 0 produits"
      : `${rangeStart}-${rangeEnd} sur ${filteredItems.length} produits`

  React.useEffect(() => {
    setCurrentPage(1)
  }, [productFilter, barcodeFilter, supplierFilter, stockFilter, vatFilter, categoryFilter])

  const pageItems = buildPageItems(currentPage, totalPages)

  function handlePageChange(nextPage: number) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages))
  }

  function handlePrint() {
    window.print()
  }

  function handleExport() {
    const csv = toCsv(filteredItems)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "inventaire.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages

  return (
    <PageShell
      title="Inventaire"
      description="Ajouter, modifier ou supprimer le stock d'un produit."
      actions={
        <InventoryProductModal
          mode="create"
          trigger={
            <Button>
              <Plus className="size-4" />
              Ajouter un produit
            </Button>
          }
        />
      }
    >
      <DataTable
        toolbar={
          <>
            <FiltersBar>
              <FilterMultiCombobox
                options={productOptions}
                label="Produits"
                onChange={setProductFilter}
              />
              <FilterMultiCombobox
                options={barcodeOptions}
                label="Code barre"
                onChange={setBarcodeFilter}
              />
              <FilterMultiCombobox
                options={supplierOptions}
                label="Fournisseurs"
                onChange={setSupplierFilter}
              />
              <FilterMultiSelect
                label="Stock"
                options={STOCK_FILTER_LABELS}
                onChange={setStockFilter}
              />
              <FilterMultiSelect
                label="TVA"
                options={VAT_FILTER_LABELS}
                onChange={setVatFilter}
              />
              <FilterMultiCombobox
                label="Categories"
                options={categoryOptions}
                onChange={setCategoryFilter}
              />
            </FiltersBar>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrint} aria-label="Imprimer">
                <Printer className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExport} aria-label="Exporter">
                <Download className="size-4" />
              </Button>
            </div>
          </>
        }
        footer={
          <DataTableFooter
            rangeLabel={rangeLabel}
            itemsPerPageOptions={["5", "10", "20"]}
            itemsPerPageValue={String(pageSize)}
            selectId="inventory-items-per-page"
            pagination={
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        if (!isFirstPage) {
                          handlePageChange(currentPage - 1)
                        }
                      }}
                      className={isFirstPage ? "pointer-events-none opacity-50" : undefined}
                    />
                  </PaginationItem>
                  {pageItems.map((page, index) => {
                    const previous = pageItems[index - 1]
                    const needsEllipsis = previous && page - previous > 1
                    return (
                      <React.Fragment key={page}>
                        {needsEllipsis ? (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : null}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            isActive={page === currentPage}
                            onClick={(event) => {
                              event.preventDefault()
                              handlePageChange(page)
                            }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      </React.Fragment>
                    )
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        if (!isLastPage) {
                          handlePageChange(currentPage + 1)
                        }
                      }}
                      className={isLastPage ? "pointer-events-none opacity-50" : undefined}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            }
          />
        }
      >
        <InventoryTable items={filteredItems} page={currentPage} pageSize={pageSize} />
      </DataTable>
    </PageShell>
  )
}
