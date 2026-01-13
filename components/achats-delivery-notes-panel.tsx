"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"

import { DataTable } from "@/components/data-table"
import { DataTableFooter } from "@/components/data-table-footer"
import { DatePickerField } from "@/components/date-picker-field"
import { FilterMultiCombobox } from "@/components/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filter-multi-select"
import { FiltersBar } from "@/components/filters-bar"
import { DeliveryNotesTable } from "@/components/achats-delivery-notes-table"
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
  DELIVERY_STATUS_OPTIONS,
  SUPPLIER_OPTIONS,
  type DeliveryNote,
} from "@/components/procurement-data"

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

function toCsv(items: DeliveryNote[]) {
  const header = [
    "ID",
    "Fournisseur",
    "Date de création",
    "Date du bon",
    "Réf livraison",
    "Total",
    "Statut",
  ]
  const rows = items.map((note) => [
    note.id,
    note.supplier,
    note.createdAt,
    note.orderDate,
    note.externalReference,
    note.total,
    note.status,
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

type DeliveryNotesPanelProps = {
  notes: DeliveryNote[]
}

export function DeliveryNotesPanel({ notes }: DeliveryNotesPanelProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [createdRange, setCreatedRange] = React.useState<DateRange | undefined>()
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [referenceFilter, setReferenceFilter] = React.useState<string[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)

  const referenceOptions = React.useMemo(
    () => Array.from(new Set(notes.map((note) => note.externalReference))),
    [notes]
  )

  const filteredNotes = React.useMemo(() => {
    return notes.filter((note) => {
      if (supplierFilter.length > 0 && !supplierFilter.includes(note.supplier)) {
        return false
      }
      if (statusFilter.length > 0 && !statusFilter.includes(note.status)) {
        return false
      }
      if (
        referenceFilter.length > 0 &&
        !referenceFilter.includes(note.externalReference)
      ) {
        return false
      }
      const orderDate = parseDate(note.orderDate)
      const createdDate = parseDate(note.createdAt)
      if (!isWithinRange(orderDate, dateRange)) return false
      if (!isWithinRange(createdDate, createdRange)) return false
      return true
    })
  }, [notes, supplierFilter, statusFilter, referenceFilter, dateRange, createdRange])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [supplierFilter, statusFilter, referenceFilter, dateRange, createdRange])

  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / PAGE_SIZE))
  const rangeStart = filteredNotes.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(filteredNotes.length, currentPage * PAGE_SIZE)
  const rangeLabel =
    filteredNotes.length === 0
      ? "0 sur 0 bons de livraison"
      : `${rangeStart}-${rangeEnd} sur ${filteredNotes.length} bons de livraison`

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
    const csv = toCsv(filteredNotes)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "bons-de-livraison.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <DataTable
      toolbar={
        <>
          <FiltersBar>
            <DatePickerField
              placeholder="Date du bon"
              value={dateRange}
              onChange={setDateRange}
            />
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
            <FilterMultiCombobox
              label="Réf livraison"
              options={referenceOptions}
              onChange={setReferenceFilter}
            />
            <FilterMultiSelect
              label="Statut"
              options={DELIVERY_STATUS_OPTIONS}
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
          selectId="delivery-notes-items-per-page"
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
      <DeliveryNotesTable notes={filteredNotes} page={currentPage} pageSize={PAGE_SIZE} />
    </DataTable>
  )
}
