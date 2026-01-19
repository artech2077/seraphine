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
import { SuppliersTable, type Supplier } from "@/features/fournisseurs/suppliers-table"
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

const BALANCE_FILTER_OPTIONS = ["Positive", "Negative", "Zero"]

function getBalanceStatus(balance: number) {
  if (balance > 0) {
    return "Positive"
  }
  if (balance < 0) {
    return "Negative"
  }
  return "Zero"
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

function toCsv(items: Supplier[]) {
  const header = ["Nom", "Email", "Telephone", "Ville", "Balance", "Notes internes"]
  const rows = items.map((item) => [
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
  const { items, isLoading, createSupplier, updateSupplier, removeSupplier } = useSuppliers()
  const { canManage } = useRoleAccess()
  const canManageSuppliers = canManage("fournisseurs")
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [cityFilter, setCityFilter] = React.useState<string[]>([])
  const [balanceFilter, setBalanceFilter] = React.useState<string[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)

  const pageSize = 5

  const supplierOptions = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.name))),
    [items]
  )
  const cityOptions = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.city))),
    [items]
  )

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (supplierFilter.length > 0 && !supplierFilter.includes(item.name)) {
        return false
      }

      if (cityFilter.length > 0 && !cityFilter.includes(item.city)) {
        return false
      }

      if (balanceFilter.length > 0) {
        const status = getBalanceStatus(item.balance)
        if (!balanceFilter.includes(status)) {
          return false
        }
      }

      return true
    })
  }, [items, supplierFilter, cityFilter, balanceFilter])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const rangeStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(filteredItems.length, currentPage * pageSize)
  const rangeLabel =
    filteredItems.length === 0
      ? "0 sur 0 fournisseurs"
      : `${rangeStart}-${rangeEnd} sur ${filteredItems.length} fournisseurs`

  React.useEffect(() => {
    setCurrentPage(1)
  }, [supplierFilter, cityFilter, balanceFilter])

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
    link.download = "fournisseurs.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages

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
        isEmpty={!isLoading && filteredItems.length === 0}
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
        <SuppliersTable
          items={filteredItems}
          page={currentPage}
          pageSize={pageSize}
          onUpdate={updateSupplier}
          onDelete={removeSupplier}
        />
      </DataTable>
    </PageShell>
  )
}
