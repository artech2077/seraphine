"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"

import { DataTable } from "@/components/tables/data-table"
import { DataTableFooter } from "@/components/tables/data-table-footer"
import { DatePickerField } from "@/components/forms/date-picker-field"
import { FilterMultiCombobox } from "@/components/filters/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filters/filter-multi-select"
import { FiltersBar } from "@/components/filters/filters-bar"
import { PurchaseOrdersTable } from "@/features/achats/achats-purchase-orders-table"
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
import { Download, Printer } from "lucide-react"
import {
  PURCHASE_STATUS_OPTIONS,
  SUPPLIER_OPTIONS,
  type PurchaseOrder,
} from "@/features/achats/procurement-data"

const PAGE_SIZE = 5

function parseDate(value: string) {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : new Date(parsed)
}

function isWithinRange(date: Date | null, range?: DateRange) {
  if (!date || !range?.from) return true
  if (date < range.from) return false
  if (range.to) {
    const endOfDay = new Date(range.to)
    endOfDay.setHours(23, 59, 59, 999)
    return date <= endOfDay
  }
  return true
}

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
    order.id,
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
  orders: PurchaseOrder[]
}

export function PurchaseOrdersPanel({ orders }: PurchaseOrdersPanelProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [createdRange, setCreatedRange] = React.useState<DateRange | undefined>()
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)

  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      if (supplierFilter.length > 0 && !supplierFilter.includes(order.supplier)) {
        return false
      }
      if (statusFilter.length > 0 && !statusFilter.includes(order.status)) {
        return false
      }
      const orderDate = parseDate(order.orderDate)
      const createdDate = parseDate(order.createdAt)
      if (!isWithinRange(orderDate, dateRange)) return false
      if (!isWithinRange(createdDate, createdRange)) return false
      return true
    })
  }, [orders, supplierFilter, statusFilter, dateRange, createdRange])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [supplierFilter, statusFilter, dateRange, createdRange])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const rangeStart = filteredOrders.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(filteredOrders.length, currentPage * PAGE_SIZE)
  const rangeLabel =
    filteredOrders.length === 0
      ? "0 sur 0 bons de commande"
      : `${rangeStart}-${rangeEnd} sur ${filteredOrders.length} bons de commande`

  const pageItems = buildPageItems(currentPage, totalPages)
  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages

  function handlePageChange(nextPage: number) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages))
  }

  function handlePrint() {
    window.print()
  }

  function handleExport() {
    const csv = toCsv(filteredOrders)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "bons-de-commande.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <DataTable
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
              options={SUPPLIER_OPTIONS}
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
      <PurchaseOrdersTable orders={filteredOrders} page={currentPage} pageSize={PAGE_SIZE} />
    </DataTable>
  )
}
