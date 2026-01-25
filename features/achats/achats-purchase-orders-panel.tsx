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
import { FiltersBar } from "@/components/filters/filters-bar"
import type { ProcurementFormValues } from "@/features/achats/api"
import { usePurchaseOrders } from "@/features/achats/api"
import { PurchaseOrdersTable } from "@/features/achats/achats-purchase-orders-table"
import { PURCHASE_STATUS_OPTIONS, type PurchaseOrder } from "@/features/achats/procurement-data"
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

const PAGE_SIZE = 5

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1])

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
}

function toCsv(items: PurchaseOrder[]) {
  const header = [
    "ID",
    "Fournisseur",
    "Canal",
    "Date de création",
    "Date du bon",
    "Total",
    "Statut",
  ]
  const rows = items.map((order) => [
    order.orderNumber,
    order.supplier,
    order.channel,
    order.createdAt,
    order.orderDate,
    order.total,
    order.status,
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

type PurchaseOrdersPanelProps = {
  suppliers: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; unitPrice: number }>
}

function normalizeDateRange(range?: DateRange) {
  if (!range) return { from: undefined, to: undefined }
  const from = range.from ? new Date(range.from) : undefined
  const to = range.to ? new Date(range.to) : undefined
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
}

function mapPurchaseStatusFilter(value: string) {
  switch (value) {
    case "Commandé":
      return "ORDERED" as const
    case "Livré":
      return "DELIVERED" as const
    default:
      return "DRAFT" as const
  }
}

export function PurchaseOrdersPanel({ suppliers, products }: PurchaseOrdersPanelProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [createdRange, setCreatedRange] = React.useState<DateRange | undefined>()
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)

  const orderDates = React.useMemo(() => normalizeDateRange(dateRange), [dateRange])
  const createdDates = React.useMemo(() => normalizeDateRange(createdRange), [createdRange])
  const statusValues = React.useMemo(
    () => statusFilter.map((status) => mapPurchaseStatusFilter(status)),
    [statusFilter]
  )

  const { orders, isLoading, totalCount, filterOptions, exportOrders, updateOrder, removeOrder } =
    usePurchaseOrders({
      mode: "paged",
      page: currentPage,
      pageSize: PAGE_SIZE,
      filters: {
        supplierNames: supplierFilter,
        statuses: statusValues,
        orderFrom: orderDates.from,
        orderTo: orderDates.to,
        createdFrom: createdDates.from,
        createdTo: createdDates.to,
      },
    })

  React.useEffect(() => {
    setCurrentPage(1)
  }, [supplierFilter, statusFilter, dateRange, createdRange])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(totalCount, currentPage * PAGE_SIZE)
  const rangeLabel =
    totalCount === 0
      ? "0 sur 0 bons de commande"
      : `${rangeStart}-${rangeEnd} sur ${totalCount} bons de commande`

  const pageItems = buildPageItems(currentPage, totalPages)
  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages

  function handlePageChange(nextPage: number) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages))
  }

  function handlePrint() {
    window.print()
  }

  async function handleExport() {
    const exported = await exportOrders()
    const csv = toCsv(exported)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "bons-de-commande.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  async function handleUpdate(order: PurchaseOrder, values: ProcurementFormValues) {
    try {
      await updateOrder(order, values)
      toast.success("Bon de commande mis à jour.")
    } catch {
      toast.error("Impossible de mettre à jour le bon de commande.")
    }
  }

  async function handleDelete(order: PurchaseOrder) {
    try {
      await removeOrder(order)
      toast.success("Bon de commande supprimé.")
    } catch {
      toast.error("Impossible de supprimer le bon de commande.")
    }
  }

  return (
    <DataTable
      isEmpty={!isLoading && totalCount === 0}
      emptyState={{
        title: "Aucun bon de commande pour le moment",
        description: "Créez un bon de commande ou ajoutez vos fournisseurs pour commencer.",
      }}
      toolbar={
        <>
          <FiltersBar>
            <DatePickerField placeholder="Date du bon" value={dateRange} onChange={setDateRange} />
            <DatePickerField
              placeholder="Date de création"
              value={createdRange}
              onChange={setCreatedRange}
            />
            <FilterMultiCombobox
              label="Fournisseurs"
              options={filterOptions.suppliers}
              onChange={setSupplierFilter}
            />
            <FilterMultiSelect
              label="Statut"
              options={PURCHASE_STATUS_OPTIONS}
              onChange={setStatusFilter}
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
          itemsPerPageValue={String(PAGE_SIZE)}
          selectId="purchase-orders-items-per-page"
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
      <PurchaseOrdersTable
        orders={orders}
        suppliers={suppliers}
        products={products}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </DataTable>
  )
}
