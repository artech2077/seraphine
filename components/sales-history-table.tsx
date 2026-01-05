"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ExpandableTable,
  ExpandableTableRow,
  ExpandableTableTrigger,
} from "@/components/expandable-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table"
import { Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

export type SaleLineItem = {
  id: string
  product: string
  quantity: number
  unitPriceHt: number
  vatRate: number
  discount: string
  totalTtc: number
}

export type SaleHistoryItem = {
  id: string
  date: string
  client: string
  seller: string
  paymentMethod: "Espèce" | "Carte" | "Crédit"
  globalDiscount: string
  amountTtc: number
  items: SaleLineItem[]
}

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
})

const paymentVariants = {
  "Espèce": "success",
  Carte: "outline",
  "Crédit": "destructive",
} as const satisfies Record<
  SaleHistoryItem["paymentMethod"],
  React.ComponentProps<typeof Badge>["variant"]
>

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function SalesHistoryTable({ sales }: { sales: SaleHistoryItem[] }) {
  type SortState = "default" | "asc" | "desc"
  type SalesSortKey =
    | "id"
    | "date"
    | "client"
    | "seller"
    | "itemsCount"
    | "globalDiscount"
    | "amountTtc"
    | "paymentMethod"
  type LineItemSortKey =
    | "product"
    | "quantity"
    | "unitPriceHt"
    | "vatRate"
    | "discount"
    | "totalTtc"

  const [sortKey, setSortKey] = React.useState<SalesSortKey | null>(null)
  const [sortState, setSortState] = React.useState<SortState>("default")
  const [lineItemSortKey, setLineItemSortKey] =
    React.useState<LineItemSortKey | null>(null)
  const [lineItemSortState, setLineItemSortState] =
    React.useState<SortState>("default")

  const getItemsCount = React.useCallback((sale: SaleHistoryItem) => {
    return sale.items.reduce((total, item) => total + item.quantity, 0)
  }, [])

  const parseDiscount = React.useCallback((value: string) => {
    if (!value || value === "-") return 0
    const numeric = Number(
      value.replace(",", ".").replace(/[^0-9.-]/g, "")
    )
    return Number.isNaN(numeric) ? 0 : numeric
  }, [])

  const sortedSales = React.useMemo(() => {
    const next = [...sales]
    if (sortState === "default" || !sortKey) {
      return next.reverse()
    }
    next.sort((a, b) => {
      let result = 0
      switch (sortKey) {
        case "id":
          result = a.id.localeCompare(b.id, "fr")
          break
        case "amountTtc":
          result = a.amountTtc - b.amountTtc
          break
        case "client":
          result = a.client.localeCompare(b.client, "fr")
          break
        case "paymentMethod":
          result = a.paymentMethod.localeCompare(b.paymentMethod, "fr")
          break
        case "itemsCount":
          result = getItemsCount(a) - getItemsCount(b)
          break
        case "globalDiscount":
          result =
            parseDiscount(a.globalDiscount) - parseDiscount(b.globalDiscount)
          break
        case "seller":
          result = a.seller.localeCompare(b.seller, "fr")
          break
        case "date": {
          const dateA = Date.parse(a.date)
          const dateB = Date.parse(b.date)
          result = Number.isNaN(dateA) || Number.isNaN(dateB)
            ? a.date.localeCompare(b.date, "fr")
            : dateA - dateB
          break
        }
        default:
          result = 0
      }
      return sortState === "asc" ? result : -result
    })
    return next
  }, [sales, sortKey, sortState, getItemsCount, parseDiscount])

  const sortedLineItems = React.useCallback(
    (items: SaleLineItem[]) => {
      const next = [...items]
      if (lineItemSortState === "default" || !lineItemSortKey) {
        return next.reverse()
      }
      next.sort((a, b) => {
        let result = 0
        switch (lineItemSortKey) {
          case "quantity":
            result = a.quantity - b.quantity
            break
          case "unitPriceHt":
            result = a.unitPriceHt - b.unitPriceHt
            break
          case "vatRate":
            result = a.vatRate - b.vatRate
            break
          case "totalTtc":
            result = a.totalTtc - b.totalTtc
            break
          case "discount":
            result = a.discount.localeCompare(b.discount, "fr")
            break
          case "product":
            result = a.product.localeCompare(b.product, "fr")
            break
          default:
            result = 0
        }
        return lineItemSortState === "asc" ? result : -result
      })
      return next
    },
    [lineItemSortKey, lineItemSortState]
  )

  function handleSort(nextKey: SalesSortKey) {
    if (sortKey !== nextKey) {
      setSortKey(nextKey)
      setSortState("asc")
      return
    }
    if (sortState === "asc") {
      setSortState("desc")
      return
    }
    if (sortState === "desc") {
      setSortState("default")
      setSortKey(null)
      return
    }
    setSortState("asc")
  }

  function handleLineItemSort(nextKey: LineItemSortKey) {
    if (lineItemSortKey !== nextKey) {
      setLineItemSortKey(nextKey)
      setLineItemSortState("asc")
      return
    }
    if (lineItemSortState === "asc") {
      setLineItemSortState("desc")
      return
    }
    if (lineItemSortState === "desc") {
      setLineItemSortState("default")
      setLineItemSortKey(null)
      return
    }
    setLineItemSortState("asc")
  }

  return (
    <ExpandableTable>
      <TableHeader>
        <TableRow>
          <SortableTableHead
            label="Details"
            hideLabel
            className="w-10"
            sortable={false}
          />
          <SortableTableHead
            label="ID vente"
            sortKey="id"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("id")}
          />
          <SortableTableHead
            label="Date"
            sortKey="date"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("date")}
          />
          <SortableTableHead
            label="Client"
            sortKey="client"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("client")}
          />
          <SortableTableHead
            label="Vendeur"
            sortKey="seller"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("seller")}
          />
          <SortableTableHead
            label="Produits"
            align="right"
            sortKey="itemsCount"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("itemsCount")}
          />
          <SortableTableHead
            label="Remise"
            sortKey="globalDiscount"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("globalDiscount")}
          />
          <SortableTableHead
            label="Montant"
            align="right"
            sortKey="amountTtc"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("amountTtc")}
          />
          <SortableTableHead
            label="Paiement"
            sortKey="paymentMethod"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("paymentMethod")}
          />
          <SortableTableHead
            label="Actions"
            align="right"
            sortable={false}
            hideLabel
          />
        </TableRow>
      </TableHeader>
      {sortedSales.map((sale) => {
        const itemsCount = getItemsCount(sale)
        return (
          <ExpandableTableRow
            key={sale.id}
            value={sale.id}
            panelColSpan={10}
            row={
              <>
                <TableCell>
                  <ExpandableTableTrigger label="Afficher les articles" />
                </TableCell>
                <TableCell className="font-medium tabular-nums">
                  {sale.id}
                </TableCell>
                <TableCell className="font-medium">{sale.date}</TableCell>
                <TableCell>{sale.client}</TableCell>
                <TableCell>{sale.seller}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {itemsCount}
                </TableCell>
                <TableCell className="tabular-nums">
                  {sale.globalDiscount}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(sale.amountTtc)}
                </TableCell>
                <TableCell>
                  <Badge variant={paymentVariants[sale.paymentMethod]}>
                    {sale.paymentMethod}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Ouvrir le menu"
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Pencil />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download />
                          Telecharger la facture
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">
                          <Trash2 />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </>
            }
            panel={
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      label="Produit"
                      sortKey="product"
                      activeSortKey={lineItemSortKey ?? undefined}
                      sortState={lineItemSortState}
                      onSort={() => handleLineItemSort("product")}
                    />
                    <SortableTableHead
                      label="Qte"
                      align="right"
                      sortKey="quantity"
                      activeSortKey={lineItemSortKey ?? undefined}
                      sortState={lineItemSortState}
                      onSort={() => handleLineItemSort("quantity")}
                    />
                    <SortableTableHead
                      label="P.U. HT"
                      align="right"
                      sortKey="unitPriceHt"
                      activeSortKey={lineItemSortKey ?? undefined}
                      sortState={lineItemSortState}
                      onSort={() => handleLineItemSort("unitPriceHt")}
                    />
                    <SortableTableHead
                      label="TVA"
                      align="right"
                      sortKey="vatRate"
                      activeSortKey={lineItemSortKey ?? undefined}
                      sortState={lineItemSortState}
                      onSort={() => handleLineItemSort("vatRate")}
                    />
                    <SortableTableHead
                      label="Remise"
                      sortKey="discount"
                      activeSortKey={lineItemSortKey ?? undefined}
                      sortState={lineItemSortState}
                      onSort={() => handleLineItemSort("discount")}
                    />
                    <SortableTableHead
                      label="Total TTC"
                      align="right"
                      sortKey="totalTtc"
                      activeSortKey={lineItemSortKey ?? undefined}
                      sortState={lineItemSortState}
                      onSort={() => handleLineItemSort("totalTtc")}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLineItems(sale.items).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(item.unitPriceHt)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.vatRate}%
                      </TableCell>
                      <TableCell>{item.discount}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(item.totalTtc)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          />
        )
      })}
    </ExpandableTable>
  )
}
