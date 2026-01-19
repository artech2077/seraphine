"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"

import { DataTable } from "@/components/tables/data-table"
import { DataTableFooter } from "@/components/tables/data-table-footer"
import { DatePickerField } from "@/components/forms/date-picker-field"
import { FilterMultiCombobox } from "@/components/filters/filter-multi-combobox"
import { FilterMultiSelect } from "@/components/filters/filter-multi-select"
import { FilterToggle } from "@/components/filters/filter-toggle"
import { FiltersBar } from "@/components/filters/filters-bar"
import { SalesHistoryTable, type SaleHistoryItem } from "@/features/ventes/sales-history-table"
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

const PAGE_SIZE = 20

const paymentOptions = ["Tous", "Espèce", "Carte", "Crédit"]

function normalizeSelections(values: string[]) {
  return values.filter((value) => !value.toLowerCase().startsWith("tous"))
}

function parseSaleDate(value: string) {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : new Date(parsed)
}

function parseDiscount(value: string) {
  if (!value || value === "-") return 0
  const numeric = Number(value.replace(",", ".").replace(/[^0-9.-]/g, ""))
  return Number.isNaN(numeric) ? 0 : numeric
}

type SalesHistoryPanelProps = {
  sales: SaleHistoryItem[]
  isLoading?: boolean
  onDelete?: (sale: SaleHistoryItem) => void | Promise<void>
}

export function SalesHistoryPanel({ sales, isLoading = false, onDelete }: SalesHistoryPanelProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [clients, setClients] = React.useState<string[]>([])
  const [sellers, setSellers] = React.useState<string[]>([])
  const [products, setProducts] = React.useState<string[]>([])
  const [payments, setPayments] = React.useState<string[]>([])
  const [discountOnly, setDiscountOnly] = React.useState(false)

  const clientOptions = React.useMemo(
    () => ["Tous les clients", ...Array.from(new Set(sales.map((sale) => sale.client)))],
    [sales]
  )
  const sellerOptions = React.useMemo(
    () => ["Tous les vendeurs", ...Array.from(new Set(sales.map((sale) => sale.seller)))],
    [sales]
  )
  const productOptions = React.useMemo(() => {
    const productsSet = new Set<string>()
    sales.forEach((sale) => sale.items.forEach((item) => productsSet.add(item.product)))
    return ["Tous les produits", ...Array.from(productsSet)]
  }, [sales])

  const filteredSales = React.useMemo(() => {
    const selectedClients = normalizeSelections(clients)
    const selectedSellers = normalizeSelections(sellers)
    const selectedProducts = normalizeSelections(products)
    const selectedPayments = normalizeSelections(payments)

    return sales.filter((sale) => {
      if (selectedClients.length > 0 && !selectedClients.includes(sale.client)) {
        return false
      }
      if (selectedSellers.length > 0 && !selectedSellers.includes(sale.seller)) {
        return false
      }
      if (selectedPayments.length > 0 && !selectedPayments.includes(sale.paymentMethod)) {
        return false
      }
      if (selectedProducts.length > 0) {
        const hasProduct = sale.items.some((item) => selectedProducts.includes(item.product))
        if (!hasProduct) return false
      }
      if (discountOnly && parseDiscount(sale.globalDiscount) <= 0) {
        return false
      }
      if (dateRange?.from) {
        const saleDate = parseSaleDate(sale.date)
        if (!saleDate) return false
        if (saleDate < dateRange.from) return false
      }
      if (dateRange?.to) {
        const saleDate = parseSaleDate(sale.date)
        if (!saleDate) return false
        const endOfDay = new Date(dateRange.to)
        endOfDay.setHours(23, 59, 59, 999)
        if (saleDate > endOfDay) return false
      }
      return true
    })
  }, [clients, dateRange, discountOnly, payments, products, sales, sellers])

  const totalSales = filteredSales.length
  const rangeStart = totalSales === 0 ? 0 : 1
  const rangeEnd = Math.min(totalSales, PAGE_SIZE)

  return (
    <DataTable
      isEmpty={!isLoading && filteredSales.length === 0}
      emptyState={{
        title: "Aucune vente enregistrée",
        description: "Les ventes apparaîtront ici après leur enregistrement.",
      }}
      toolbar={
        <>
          <FiltersBar>
            <DatePickerField placeholder="Date" value={dateRange} onChange={setDateRange} />
            <FilterMultiCombobox label="Clients" options={clientOptions} onChange={setClients} />
            <FilterMultiSelect label="Vendeurs" options={sellerOptions} onChange={setSellers} />
            <FilterMultiCombobox label="Produits" options={productOptions} onChange={setProducts} />
            <FilterMultiSelect label="Paiements" options={paymentOptions} onChange={setPayments} />
            <FilterToggle
              id="remise-toggle"
              label="Remise"
              checked={discountOnly}
              onCheckedChange={(checked) => setDiscountOnly(Boolean(checked))}
            />
          </FiltersBar>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Imprimer">
              <Printer className="size-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Telecharger">
              <Download className="size-4" />
            </Button>
          </div>
        </>
      }
      footer={
        <DataTableFooter
          rangeLabel={`${rangeStart}-${rangeEnd} sur ${totalSales} ventes`}
          selectId="sales-items-per-page"
          pagination={
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    1
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">8</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          }
        />
      }
    >
      <SalesHistoryTable sales={filteredSales} onDelete={onDelete} />
    </DataTable>
  )
}
