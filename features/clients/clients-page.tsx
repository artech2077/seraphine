"use client"

import * as React from "react"

import { DataTable } from "@/components/tables/data-table"
import { DataTableFooter } from "@/components/tables/data-table-footer"
import { FilterMultiCombobox } from "@/components/filters/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filters/filter-multi-select"
import { FiltersBar } from "@/components/filters/filters-bar"
import { PageShell } from "@/components/layout/page-shell"
import { ClientModal } from "@/features/clients/client-modal"
import { ClientsTable, type Client, type ClientStatus } from "@/features/clients/clients-table"
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

type ClientsPageProps = {
  items: Client[]
}

const BALANCE_FILTER_OPTIONS: ClientStatus[] = ["OK", "Surveillé", "Bloqué"]

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1])

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
}

function toCsv(items: Client[]) {
  const header = [
    "Nom",
    "Telephone",
    "Ville",
    "Plafond",
    "Encours",
    "Statut",
    "Dernier achat",
    "Notes internes",
  ]
  const rows = items.map((item) => [
    item.name,
    item.phone,
    item.city,
    item.plafond,
    item.encours,
    item.status,
    item.lastPurchase,
    item.notes ?? "",
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

export function ClientsPage({ items }: ClientsPageProps) {
  const [clientFilter, setClientFilter] = React.useState<string[]>([])
  const [cityFilter, setCityFilter] = React.useState<string[]>([])
  const [balanceFilter, setBalanceFilter] = React.useState<string[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)

  const pageSize = 5

  const clientOptions = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.name))),
    [items]
  )
  const cityOptions = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.city))),
    [items]
  )

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (clientFilter.length > 0 && !clientFilter.includes(item.name)) {
        return false
      }

      if (cityFilter.length > 0 && !cityFilter.includes(item.city)) {
        return false
      }

      if (balanceFilter.length > 0 && !balanceFilter.includes(item.status)) {
        return false
      }

      return true
    })
  }, [items, clientFilter, cityFilter, balanceFilter])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const rangeStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(filteredItems.length, currentPage * pageSize)
  const rangeLabel =
    filteredItems.length === 0
      ? "0 sur 0 clients"
      : `${rangeStart}-${rangeEnd} sur ${filteredItems.length} clients`

  React.useEffect(() => {
    setCurrentPage(1)
  }, [clientFilter, cityFilter, balanceFilter])

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
    link.download = "clients.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages

  return (
    <PageShell
      title="Suivi des encours"
      description="Suivez les encours client et les statuts de crédit."
      actions={
        <ClientModal
          mode="create"
          trigger={
            <Button>
              <Plus className="size-4" />
              Ajouter un client
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
                options={clientOptions}
                label="Clients"
                onChange={setClientFilter}
              />
              <FilterMultiSelect label="Ville" options={cityOptions} onChange={setCityFilter} />
              <FilterMultiSelect
                label="Balance"
                options={BALANCE_FILTER_OPTIONS}
                onChange={setBalanceFilter}
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
            selectId="clients-items-per-page"
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
        <ClientsTable items={filteredItems} page={currentPage} pageSize={pageSize} />
      </DataTable>
    </PageShell>
  )
}
