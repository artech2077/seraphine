"use client"

import * as React from "react"

import { DataTable } from "@/components/tables/data-table"
import { DataTableFooter } from "@/components/tables/data-table-footer"
import { FilterMultiCombobox } from "@/components/filters/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filters/filter-multi-select"
import { FiltersBar } from "@/components/filters/filters-bar"
import { PageShell } from "@/components/layout/page-shell"
import { useClients } from "@/features/clients/api"
import { ClientModal } from "@/features/clients/client-modal"
import { useRoleAccess } from "@/lib/auth/use-role-access"
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

const BALANCE_FILTER_OPTIONS: ClientStatus[] = ["OK", "Surveillé", "Bloqué"]
const PAGE_SIZE_OPTIONS = ["20", "50", "100"]

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
    "ID",
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
    item.clientNumber,
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

export function ClientsPage() {
  const { canManage } = useRoleAccess()
  const canManageClients = canManage("clients")
  const [clientFilter, setClientFilter] = React.useState<string[]>([])
  const [cityFilter, setCityFilter] = React.useState<string[]>([])
  const [balanceFilter, setBalanceFilter] = React.useState<ClientStatus[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)

  const {
    items,
    isLoading,
    createClient,
    updateClient,
    removeClient,
    totalCount,
    filterOptions,
    exportClients,
  } = useClients({
    mode: "paged",
    page: currentPage,
    pageSize,
    filters: {
      names: clientFilter,
      cities: cityFilter,
      statuses: balanceFilter,
    },
  })

  const clientOptions = filterOptions.names
  const cityOptions = filterOptions.cities

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(totalCount, currentPage * pageSize)
  const rangeLabel =
    totalCount === 0 ? "0 sur 0 clients" : `${rangeStart}-${rangeEnd} sur ${totalCount} clients`

  React.useEffect(() => {
    setCurrentPage(1)
  }, [clientFilter, cityFilter, balanceFilter, pageSize])

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
    const exported = await exportClients()
    const csv = toCsv(exported)
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
          onSubmit={(values) => createClient(values)}
          trigger={
            <Button disabled={!canManageClients}>
              <Plus className="size-4" />
              Ajouter un client
            </Button>
          }
        />
      }
    >
      <DataTable
        isEmpty={!isLoading && totalCount === 0}
        emptyState={{
          title: "Aucun client pour le moment",
          description: "Ajoutez un client pour commencer à suivre les encours.",
        }}
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
            itemsPerPageOptions={PAGE_SIZE_OPTIONS}
            itemsPerPageValue={String(pageSize)}
            itemsPerPageOnChange={handlePageSizeChange}
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
        <ClientsTable items={items} onUpdate={updateClient} onDelete={removeClient} />
      </DataTable>
    </PageShell>
  )
}
