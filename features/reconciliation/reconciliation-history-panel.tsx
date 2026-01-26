"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"
import { Download, Printer } from "lucide-react"

import { DataTable } from "@/components/tables/data-table"
import { DataTableFooter } from "@/components/tables/data-table-footer"
import { DatePickerField } from "@/components/forms/date-picker-field"
import { FiltersBar } from "@/components/filters/filters-bar"
import { ReconciliationHistoryTable } from "@/features/reconciliation/reconciliation-history-table"
import { useReconciliationHistory } from "@/features/reconciliation/api"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PAGE_SIZE = 5
const STATUS_OPTIONS = ["Tous", "Validé", "Écart", "Excédent"]

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

export function ReconciliationHistoryPanel() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [statusFilter, setStatusFilter] = React.useState("Tous")
  const [currentPage, setCurrentPage] = React.useState(1)

  const dateFilters = React.useMemo(() => normalizeDateRange(dateRange), [dateRange])

  const { items, isLoading, totalCount, exportHistory } = useReconciliationHistory({
    page: currentPage,
    pageSize: PAGE_SIZE,
    filters: {
      from: dateFilters.from,
      to: dateFilters.to,
      status: statusFilter,
    },
  })

  React.useEffect(() => {
    setCurrentPage(1)
  }, [dateRange, statusFilter])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(totalCount, currentPage * PAGE_SIZE)
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages

  function handlePageChange(nextPage: number) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages))
  }

  function buildPageItems() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1])

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b)
  }

  const pageItems = buildPageItems()

  async function handleExport() {
    const exported = await exportHistory()
    if (exported.length === 0) return
    const header = ["ID", "Date", "Ouverture", "Attendu", "Compté"]
    const rows = exported.map((item) => [
      item.id,
      item.date,
      item.opening,
      item.expected,
      item.counted,
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
    link.download = "reconciliation.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <DataTable
      isEmpty={!isLoading && totalCount === 0}
      emptyState={{
        title: "Aucune réconciliation enregistrée",
        description: "Les clôtures apparaîtront ici après la première journée enregistrée.",
      }}
      toolbar={
        <>
          <FiltersBar>
            <DatePickerField
              id="reconciliation-date-range"
              placeholder="Date"
              value={dateRange}
              onChange={setDateRange}
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value ?? "Tous")}
            >
              <SelectTrigger className="h-8 w-36">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltersBar>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Imprimer">
              <Printer className="size-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Exporter" onClick={handleExport}>
              <Download className="size-4" />
            </Button>
          </div>
        </>
      }
      footer={
        <DataTableFooter
          rangeLabel={`${rangeStart}-${rangeEnd} sur ${totalCount} lignes`}
          itemsPerPageOptions={["5", "10", "20"]}
          itemsPerPageValue={String(PAGE_SIZE)}
          selectId="reconciliation-items-per-page"
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
      <ReconciliationHistoryTable items={items} />
    </DataTable>
  )
}
