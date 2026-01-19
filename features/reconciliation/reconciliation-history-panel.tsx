"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"
import { Download, Printer } from "lucide-react"

import { DataTable } from "@/components/tables/data-table"
import { DataTableFooter } from "@/components/tables/data-table-footer"
import { DatePickerField } from "@/components/forms/date-picker-field"
import { FiltersBar } from "@/components/filters/filters-bar"
import {
  ReconciliationHistoryTable,
  type ReconciliationHistoryItem,
} from "@/features/reconciliation/reconciliation-history-table"
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

type ReconciliationStatus = "Validé" | "Écart" | "Excédent"

function getStatus(difference: number): ReconciliationStatus {
  if (difference === 0) return "Validé"
  if (difference < 0) return "Écart"
  return "Excédent"
}

function parseDate(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function ReconciliationHistoryPanel({
  items,
  isLoading = false,
}: {
  items: ReconciliationHistoryItem[]
  isLoading?: boolean
}) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [statusFilter, setStatusFilter] = React.useState("Tous")
  const [currentPage, setCurrentPage] = React.useState(1)

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const difference = item.counted - item.expected
      const status = getStatus(difference)

      if (statusFilter !== "Tous" && status !== statusFilter) {
        return false
      }

      if (dateRange?.from) {
        const itemDate = parseDate(item.date)
        if (!itemDate || itemDate < dateRange.from) {
          return false
        }
      }

      if (dateRange?.to) {
        const itemDate = parseDate(item.date)
        if (!itemDate) {
          return false
        }
        const endOfDay = new Date(dateRange.to)
        endOfDay.setHours(23, 59, 59, 999)
        if (itemDate > endOfDay) {
          return false
        }
      }

      return true
    })
  }, [dateRange, items, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const currentItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const rangeStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(filteredItems.length, currentPage * PAGE_SIZE)
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages

  React.useEffect(() => {
    setCurrentPage(1)
  }, [dateRange, statusFilter])

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

  return (
    <DataTable
      isEmpty={!isLoading && filteredItems.length === 0}
      emptyState={{
        title: "Aucune réconciliation enregistrée",
        description: "Les clôtures apparaîtront ici après la première journée enregistrée.",
      }}
      toolbar={
        <>
          <FiltersBar>
            <DatePickerField placeholder="Date" value={dateRange} onChange={setDateRange} />
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
            <Button variant="outline" size="icon" aria-label="Exporter">
              <Download className="size-4" />
            </Button>
          </div>
        </>
      }
      footer={
        <DataTableFooter
          rangeLabel={`${rangeStart}-${rangeEnd} sur ${filteredItems.length} lignes`}
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
      <ReconciliationHistoryTable items={currentItems} />
    </DataTable>
  )
}
