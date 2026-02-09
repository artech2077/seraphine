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
import { useDeliveryNotes } from "@/features/achats/api"
import {
  DeliveryNotesTable,
  DeliveryNotesTableSkeleton,
} from "@/features/achats/achats-delivery-notes-table"
import {
  DELIVERY_STATUS_OPTIONS,
  type DeliveryNote,
  type ProductOption,
} from "@/features/achats/procurement-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants/pagination"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1])

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
    "Date d'échéance",
    "Réf livraison",
    "Type remise",
    "Valeur remise",
    "Total",
    "Statut",
  ]
  const rows = items.map((note) => [
    note.orderNumber,
    note.supplier,
    note.createdAt,
    note.orderDate,
    note.dueDate ?? "",
    note.externalReference,
    note.globalDiscountType === "amount" ? "Montant" : "%",
    note.globalDiscountValue ?? 0,
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
  suppliers: Array<{ id: string; name: string }>
  products: ProductOption[]
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

function mapDeliveryStatusFilter(value: string) {
  switch (value) {
    case "Commandé":
      return "ORDERED" as const
    case "En cours":
      return "IN_PROGRESS" as const
    case "Livré":
      return "DELIVERED" as const
    default:
      return "DRAFT" as const
  }
}

export function DeliveryNotesPanel({ suppliers, products }: DeliveryNotesPanelProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [dueRange, setDueRange] = React.useState<DateRange | undefined>()
  const [createdRange, setCreatedRange] = React.useState<DateRange | undefined>()
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [referenceFilter, setReferenceFilter] = React.useState<string[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE)

  const orderDates = React.useMemo(() => normalizeDateRange(dateRange), [dateRange])
  const dueDates = React.useMemo(() => normalizeDateRange(dueRange), [dueRange])
  const createdDates = React.useMemo(() => normalizeDateRange(createdRange), [createdRange])
  const statusValues = React.useMemo(
    () => statusFilter.map((status) => mapDeliveryStatusFilter(status)),
    [statusFilter]
  )

  const {
    notes,
    isLoading,
    isFetching,
    totalCount,
    filterOptions,
    exportNotes,
    updateNote,
    removeNote,
  } = useDeliveryNotes({
    mode: "paged",
    page: currentPage,
    pageSize,
    filters: {
      supplierNames: supplierFilter,
      statuses: statusValues,
      references: referenceFilter,
      orderFrom: orderDates.from,
      orderTo: orderDates.to,
      dueFrom: dueDates.from,
      dueTo: dueDates.to,
      createdFrom: createdDates.from,
      createdTo: createdDates.to,
    },
  })

  React.useEffect(() => {
    setCurrentPage(1)
  }, [supplierFilter, statusFilter, referenceFilter, dateRange, dueRange, createdRange, pageSize])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(totalCount, currentPage * pageSize)
  const rangeLabel =
    totalCount === 0
      ? "0 sur 0 bons de livraison"
      : `${rangeStart}-${rangeEnd} sur ${totalCount} bons de livraison`

  const pageItems = buildPageItems(currentPage, totalPages)
  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages
  const showSkeleton = isLoading && notes.length === 0

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
    const exported = await exportNotes()
    const csv = toCsv(exported)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "bons-de-livraison.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  async function handleUpdate(note: DeliveryNote, values: ProcurementFormValues) {
    try {
      await updateNote(note, values)
      toast.success("Bon de livraison mis à jour.")
    } catch {
      toast.error("Impossible de mettre à jour le bon de livraison.")
    }
  }

  async function handleDelete(note: DeliveryNote) {
    try {
      await removeNote(note)
      toast.success("Bon de livraison supprimé.")
    } catch {
      toast.error("Impossible de supprimer le bon de livraison.")
    }
  }

  return (
    <DataTable
      isEmpty={!isLoading && totalCount === 0}
      emptyState={{
        title: "Aucun bon de livraison pour le moment",
        description: "Enregistrez une livraison ou associez un fournisseur pour commencer.",
      }}
      toolbar={
        <>
          <FiltersBar>
            <DatePickerField
              id="delivery-notes-date"
              placeholder="Date du bon"
              value={dateRange}
              onChange={setDateRange}
            />
            <DatePickerField
              id="delivery-notes-due-date"
              placeholder="Date d'échéance"
              value={dueRange}
              onChange={setDueRange}
            />
            <DatePickerField
              id="delivery-notes-created-date"
              placeholder="Date de création"
              value={createdRange}
              onChange={setCreatedRange}
            />
            <FilterMultiCombobox
              label="Fournisseurs"
              options={filterOptions.suppliers}
              onChange={setSupplierFilter}
            />
            <FilterMultiCombobox
              label="Réf livraison"
              options={filterOptions.references}
              onChange={setReferenceFilter}
            />
            <FilterMultiSelect
              label="Statut"
              options={DELIVERY_STATUS_OPTIONS}
              onChange={setStatusFilter}
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
      {showSkeleton ? (
        <DeliveryNotesTableSkeleton rows={pageSize} />
      ) : (
        <DeliveryNotesTable
          notes={notes}
          suppliers={suppliers}
          products={products}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </DataTable>
  )
}
