"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"
import { Download, Printer } from "lucide-react"
import { toast } from "sonner"

import { DataTable } from "@/components/tables/data-table"
import { DataTableFooter } from "@/components/tables/data-table-footer"
import { DatePickerField } from "@/components/forms/date-picker-field"
import { FilterMultiCombobox } from "@/components/filters/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filters/filter-multi-select"
import { FilterToggle } from "@/components/filters/filter-toggle"
import { FiltersBar } from "@/components/filters/filters-bar"
import { useSalesHistory } from "@/features/ventes/api"
import { SalesHistoryTable, type SaleHistoryItem } from "@/features/ventes/sales-history-table"
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

const PAGE_SIZE_OPTIONS = ["20", "50", "100"]

const paymentOptions = ["Tous", "Espèce", "Carte", "Crédit"]

function normalizeSelections(values: string[]) {
  return values.filter((value) => !value.toLowerCase().startsWith("tous"))
}

export function SalesHistoryPanel() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [clients, setClients] = React.useState<string[]>([])
  const [sellers, setSellers] = React.useState<string[]>([])
  const [products, setProducts] = React.useState<string[]>([])
  const [payments, setPayments] = React.useState<string[]>([])
  const [discountOnly, setDiscountOnly] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)

  const dateFilters = React.useMemo(() => {
    const from = dateRange?.from ? new Date(dateRange.from) : undefined
    const to = dateRange?.to ? new Date(dateRange.to) : undefined
    if (from) {
      from.setHours(0, 0, 0, 0)
    }
    if (to) {
      to.setHours(23, 59, 59, 999)
    }
    return {
      from: from ? from.getTime() : undefined,
      to: to ? to.getTime() : undefined,
    }
  }, [dateRange])

  const selectedClients = React.useMemo(() => normalizeSelections(clients), [clients])
  const selectedSellers = React.useMemo(() => normalizeSelections(sellers), [sellers])
  const selectedProducts = React.useMemo(() => normalizeSelections(products), [products])
  const selectedPayments = React.useMemo(() => normalizeSelections(payments), [payments])

  const {
    items: sales,
    isLoading,
    totalCount,
    filterOptions,
    removeSale,
    exportSales,
  } = useSalesHistory({
    mode: "paged",
    page: currentPage,
    pageSize,
    filters: {
      from: dateFilters.from,
      to: dateFilters.to,
      clients: selectedClients,
      sellers: selectedSellers,
      products: selectedProducts,
      payments: selectedPayments,
      discountOnly,
    },
  })

  const clientOptions = React.useMemo(
    () => ["Tous les clients", ...filterOptions.clients],
    [filterOptions.clients]
  )
  const sellerOptions = React.useMemo(
    () => ["Tous les vendeurs", ...filterOptions.sellers],
    [filterOptions.sellers]
  )
  const productOptions = React.useMemo(
    () => ["Tous les produits", ...filterOptions.products],
    [filterOptions.products]
  )

  React.useEffect(() => {
    setCurrentPage(1)
  }, [clients, dateRange, discountOnly, pageSize, payments, products, sellers])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(totalCount, currentPage * pageSize)
  const rangeLabel =
    totalCount === 0 ? "0 sur 0 ventes" : `${rangeStart}-${rangeEnd} sur ${totalCount} ventes`

  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages

  function handlePageChange(nextPage: number) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages))
  }

  function handlePageSizeChange(value: string) {
    const nextSize = Number(value)
    if (!Number.isNaN(nextSize) && nextSize > 0) {
      setPageSize(nextSize)
    }
  }

  function buildPageItems(current: number, total: number) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1)
    }

    const pages = new Set<number>([1, total, current, current - 1, current + 1])

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= total)
      .sort((a, b) => a - b)
  }

  const pageItems = buildPageItems(currentPage, totalPages)

  async function handleDelete(sale: SaleHistoryItem) {
    try {
      await removeSale(sale)
      toast.success("Vente supprimée.")
    } catch {
      toast.error("Impossible de supprimer la vente.")
    }
  }

  async function handleExport() {
    const exported = await exportSales()
    if (exported.length === 0) return
    const header = ["ID", "Date", "Client", "Vendeur", "Paiement", "Remise", "Montant"]
    const rows = exported.map((sale) => [
      sale.saleNumber,
      sale.date,
      sale.client,
      sale.seller,
      sale.paymentMethod,
      sale.globalDiscount,
      sale.amountTtc,
    ])

    const csv = [header, ...rows]
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

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "ventes.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <DataTable
      isEmpty={!isLoading && totalCount === 0}
      emptyState={{
        title: "Aucune vente enregistrée",
        description: "Les ventes apparaîtront ici après leur enregistrement.",
      }}
      toolbar={
        <>
          <FiltersBar>
            <DatePickerField placeholder="Date" value={dateRange} onChange={setDateRange} />
            <FilterMultiCombobox label="Clients" options={clientOptions} onChange={setClients} />
            <FilterMultiSelect label="Vendeurs" options={sellerOptions} onChange={setSellers} />
            <FilterMultiCombobox label="Produits" options={productOptions} onChange={setProducts} />
            <FilterMultiSelect label="Paiements" options={paymentOptions} onChange={setPayments} />
            <FilterToggle
              id="remise-toggle"
              label="Remise"
              checked={discountOnly}
              onCheckedChange={(checked) => setDiscountOnly(Boolean(checked))}
            />
          </FiltersBar>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Imprimer">
              <Printer className="size-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Telecharger" onClick={handleExport}>
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
          selectId="sales-items-per-page"
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
      <SalesHistoryTable sales={sales} onDelete={handleDelete} />
    </DataTable>
  )
}
