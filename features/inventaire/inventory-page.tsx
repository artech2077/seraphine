"use client"

import * as React from "react"

import { DataTable } from "@/components/tables/data-table"
import { DataTableFooter } from "@/components/tables/data-table-footer"
import { FilterMultiCombobox } from "@/components/filters/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filters/filter-multi-select"
import { FiltersBar } from "@/components/filters/filters-bar"
import { useInventoryItems } from "@/features/inventaire/api"
import { BatchProductModal } from "@/features/inventaire/batch-product-modal"
import { InventoryProductModal } from "@/features/inventaire/inventory-product-modal"
import {
  InventoryTable,
  InventoryTableSkeleton,
  type InventoryItem,
} from "@/features/inventaire/inventory-table"
import { PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { PAGE_SIZE_OPTIONS } from "@/lib/constants/pagination"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Download, ListPlus, Plus, Printer } from "lucide-react"
import { toast } from "sonner"

const STOCK_FILTER_LABELS = ["Tous", "En stock", "Stock bas", "Rupture"]
const VAT_FILTER_LABELS = ["Toutes", "0%", "7%", "20%"]

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1])

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

export function InventoryPage() {
  const { canManage } = useRoleAccess()
  const canManageInventory = canManage("inventaire")
  const [productFilter, setProductFilter] = React.useState<string[]>([])
  const [barcodeFilter, setBarcodeFilter] = React.useState<string[]>([])
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [stockFilter, setStockFilter] = React.useState<string[]>([])
  const [vatFilter, setVatFilter] = React.useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = React.useState<string[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)

  const stockFilterValues = React.useMemo(
    () => stockFilter.filter((value) => value !== "Tous"),
    [stockFilter]
  )
  const vatRates = React.useMemo(
    () =>
      vatFilter.filter((value) => value !== "Toutes").map((rate) => Number(rate.replace("%", ""))),
    [vatFilter]
  )

  const {
    items,
    isLoading,
    isFetching,
    createProduct,
    createProductsBatch,
    updateProduct,
    removeProduct,
    totalCount,
    filterOptions,
    exportInventory,
  } = useInventoryItems({
    mode: "paged",
    page: currentPage,
    pageSize,
    filters: {
      names: productFilter,
      barcodes: barcodeFilter,
      suppliers: supplierFilter,
      categories: categoryFilter,
      stockStatuses: stockFilterValues,
      vatRates,
    },
  })

  const productOptions = filterOptions.names
  const barcodeOptions = filterOptions.barcodes
  const supplierOptions = filterOptions.suppliers
  const categoryOptions = filterOptions.categories

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(totalCount, currentPage * pageSize)
  const rangeLabel =
    totalCount === 0 ? "0 sur 0 produits" : `${rangeStart}-${rangeEnd} sur ${totalCount} produits`

  React.useEffect(() => {
    setCurrentPage(1)
  }, [
    productFilter,
    barcodeFilter,
    supplierFilter,
    stockFilter,
    vatFilter,
    categoryFilter,
    pageSize,
  ])

  const pageItems = buildPageItems(currentPage, totalPages)

  function handlePageChange(nextPage: number) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages))
  }

  function handlePageSizeChange(value: string) {
    const nextSize = Number(value)
    if (!Number.isNaN(nextSize) && nextSize > 0) {
      setPageSize(nextSize)
    }
  }

  function handlePrint() {
    window.print()
  }

  async function handleExport() {
    const exported = await exportInventory()
    const csv = toCsv(exported)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "produits.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages
  const showSkeleton = isLoading && items.length === 0

  return (
    <PageShell
      title="Produits"
      description="Ajouter, modifier et organiser votre catalogue produit."
      actions={
        <div className="flex items-center gap-2">
          <BatchProductModal
            onSubmit={async (values) => {
              try {
                await createProductsBatch(values)
                toast.success(
                  values.length > 1 ? `${values.length} produits ajoutés.` : "1 produit ajouté."
                )
              } catch (error) {
                toast.error("Impossible d'importer les produits.")
                throw error
              }
            }}
            trigger={
              <Button variant="outline" disabled={!canManageInventory}>
                <ListPlus className="size-4" />
                Ajouter en lot
              </Button>
            }
          />
          <InventoryProductModal
            mode="create"
            onSubmit={async (values) => {
              try {
                await createProduct(values)
                toast.success("Produit ajouté.")
              } catch (error) {
                toast.error("Impossible d'ajouter le produit.")
                throw error
              }
            }}
            trigger={
              <Button disabled={!canManageInventory}>
                <Plus className="size-4" />
                Ajouter un produit
              </Button>
            }
          />
        </div>
      }
    >
      <DataTable
        isEmpty={!isLoading && totalCount === 0}
        emptyState={{
          title: "Aucun produit pour le moment",
          description: "Ajoutez un produit ou importez votre catalogue pour commencer.",
        }}
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
              <FilterMultiSelect label="TVA" options={VAT_FILTER_LABELS} onChange={setVatFilter} />
              <FilterMultiCombobox
                label="Categories"
                options={categoryOptions}
                onChange={setCategoryFilter}
              />
            </FiltersBar>
            <div className="ml-auto flex items-center gap-2">
              {isFetching ? (
                <Badge variant="secondary">
                  <Spinner className="size-3" />
                  Mise a jour
                </Badge>
              ) : null}
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
            itemsPerPageOptions={PAGE_SIZE_OPTIONS}
            itemsPerPageValue={String(pageSize)}
            itemsPerPageOnChange={handlePageSizeChange}
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
        {showSkeleton ? (
          <InventoryTableSkeleton rows={pageSize} />
        ) : (
          <InventoryTable
            items={items}
            onUpdate={async (item, values) => {
              try {
                await updateProduct(item, values)
                toast.success("Produit mis à jour.")
              } catch (error) {
                toast.error("Impossible de mettre à jour le produit.")
                throw error
              }
            }}
            onDelete={async (item) => {
              try {
                await removeProduct(item)
                toast.success("Produit supprimé.")
              } catch {
                toast.error("Impossible de supprimer le produit.")
              }
            }}
          />
        )}
      </DataTable>
    </PageShell>
  )
}
