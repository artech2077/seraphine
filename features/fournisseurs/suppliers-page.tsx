"use client"

import * as React from "react"

import { DataTable } from "@/components/tables/data-table"
import { DataTableFooter } from "@/components/tables/data-table-footer"
import { FilterMultiCombobox } from "@/components/filters/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filters/filter-multi-select"
import { FiltersBar } from "@/components/filters/filters-bar"
import { PageShell } from "@/components/layout/page-shell"
import { useSuppliers } from "@/features/fournisseurs/api"
import { SupplierModal } from "@/features/fournisseurs/supplier-modal"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import {
  SuppliersTable,
  SuppliersTableSkeleton,
  type Supplier,
} from "@/features/fournisseurs/suppliers-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
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

const BALANCE_FILTER_OPTIONS = ["Positive", "Negative", "Zero"]
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

function toCsv(items: Supplier[]) {
  const header = ["ID", "Nom", "Email", "Telephone", "Ville", "Balance", "Notes internes"]
  const rows = items.map((item) => [
    item.supplierNumber,
    item.name,
    item.email,
    item.phone,
    item.city,
    item.balance,
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

export function SuppliersPage() {
  const { canManage } = useRoleAccess()
  const canManageSuppliers = canManage("fournisseurs")
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [cityFilter, setCityFilter] = React.useState<string[]>([])
  const [balanceFilter, setBalanceFilter] = React.useState<string[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)

  const {
    items,
    isLoading,
    isFetching,
    createSupplier,
    updateSupplier,
    removeSupplier,
    totalCount,
    filterOptions,
    exportSuppliers,
  } = useSuppliers({
    mode: "paged",
    page: currentPage,
    pageSize,
    filters: {
      names: supplierFilter,
      cities: cityFilter,
      balances: balanceFilter,
    },
  })

  const supplierOptions = filterOptions.names
  const cityOptions = filterOptions.cities

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(totalCount, currentPage * pageSize)
  const rangeLabel =
    totalCount === 0
      ? "0 sur 0 fournisseurs"
      : `${rangeStart}-${rangeEnd} sur ${totalCount} fournisseurs`

  React.useEffect(() => {
    setCurrentPage(1)
  }, [supplierFilter, cityFilter, balanceFilter, pageSize])

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
    const exported = await exportSuppliers()
    const csv = toCsv(exported)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "fournisseurs.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages
  const showSkeleton = isLoading && items.length === 0

  return (
    <PageShell
      title="Liste des Fournisseurs"
      description="Ajoutez et suivez vos partenaires de distribution."
      actions={
        <SupplierModal
          mode="create"
          onSubmit={(values) => createSupplier(values)}
          trigger={
            <Button disabled={!canManageSuppliers}>
              <Plus className="size-4" />
              Ajouter un fournisseur
            </Button>
          }
        />
      }
    >
      <DataTable
        isEmpty={!isLoading && totalCount === 0}
        emptyState={{
          title: "Aucun fournisseur pour le moment",
          description: "Ajoutez un fournisseur pour demarrer vos achats.",
        }}
        toolbar={
          <>
            <FiltersBar>
              <FilterMultiCombobox
                options={supplierOptions}
                label="Fournisseurs"
                onChange={setSupplierFilter}
              />
              <FilterMultiSelect label="Ville" options={cityOptions} onChange={setCityFilter} />
              <FilterMultiSelect
                label="Balance"
                options={BALANCE_FILTER_OPTIONS}
                onChange={setBalanceFilter}
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
            selectId="suppliers-items-per-page"
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
          <SuppliersTableSkeleton rows={pageSize} />
        ) : (
          <SuppliersTable items={items} onUpdate={updateSupplier} onDelete={removeSupplier} />
        )}
      </DataTable>
    </PageShell>
  )
}
