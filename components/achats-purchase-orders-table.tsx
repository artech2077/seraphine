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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ProcurementOrderModal } from "@/components/procurement-order-modal"
import type { PurchaseOrder, PurchaseOrderStatus } from "@/components/procurement-data"
import { Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

function formatDate(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return dateFormatter.format(new Date(parsed))
}

function getStatusVariant(status: PurchaseOrderStatus) {
  switch (status) {
    case "Brouillon":
      return "secondary"
    case "Commandé":
      return "success"
    case "Livré":
    default:
      return "default"
  }
}

type PurchaseOrdersTableProps = {
  orders: PurchaseOrder[]
  page?: number
  pageSize?: number
}

type PurchaseOrdersSortKey =
  | "supplier"
  | "channel"
  | "createdAt"
  | "orderDate"
  | "total"
  | "status"

export function PurchaseOrdersTable({
  orders,
  page = 1,
  pageSize,
}: PurchaseOrdersTableProps) {
  type SortState = "default" | "asc" | "desc"

  const [sortKey, setSortKey] = React.useState<PurchaseOrdersSortKey | null>(null)
  const [sortState, setSortState] = React.useState<SortState>("default")
  const [editOpen, setEditOpen] = React.useState(false)
  const [activeOrder, setActiveOrder] = React.useState<PurchaseOrder | null>(null)

  const sortedOrders = React.useMemo(() => {
    const next = [...orders]
    if (!sortKey || sortState === "default") {
      return next
    }
    next.sort((a, b) => {
      let result = 0
      switch (sortKey) {
        case "supplier":
          result = a.supplier.localeCompare(b.supplier, "fr")
          break
        case "channel":
          result = a.channel.localeCompare(b.channel, "fr")
          break
        case "createdAt":
          result = Date.parse(a.createdAt) - Date.parse(b.createdAt)
          break
        case "orderDate":
          result = Date.parse(a.orderDate) - Date.parse(b.orderDate)
          break
        case "total":
          result = a.total - b.total
          break
        case "status":
        default:
          result = a.status.localeCompare(b.status, "fr")
      }
      return sortState === "asc" ? result : -result
    })
    return next
  }, [orders, sortKey, sortState])

  const visibleOrders = React.useMemo(() => {
    if (!pageSize) return sortedOrders
    const start = (page - 1) * pageSize
    return sortedOrders.slice(start, start + pageSize)
  }, [page, pageSize, sortedOrders])

  function handleSort(nextKey: PurchaseOrdersSortKey) {
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

  function handleEdit(order: PurchaseOrder) {
    setActiveOrder(order)
    setEditOpen(true)
  }

  function handleEditOpenChange(nextOpen: boolean) {
    setEditOpen(nextOpen)
    if (!nextOpen) {
      setActiveOrder(null)
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead label="ID" sortable={false} />
            <SortableTableHead
              label="Fournisseur"
              sortKey="supplier"
              activeSortKey={sortKey ?? undefined}
              sortState={sortState}
              onSort={() => handleSort("supplier")}
            />
            <SortableTableHead
              label="Canal"
              sortKey="channel"
              activeSortKey={sortKey ?? undefined}
              sortState={sortState}
              onSort={() => handleSort("channel")}
            />
            <SortableTableHead
              label="Date de création"
              sortKey="createdAt"
              activeSortKey={sortKey ?? undefined}
              sortState={sortState}
              onSort={() => handleSort("createdAt")}
            />
            <SortableTableHead
              label="Date du bon"
              sortKey="orderDate"
              activeSortKey={sortKey ?? undefined}
              sortState={sortState}
              onSort={() => handleSort("orderDate")}
            />
            <SortableTableHead
              label="Total"
              align="right"
              sortKey="total"
              activeSortKey={sortKey ?? undefined}
              sortState={sortState}
              onSort={() => handleSort("total")}
            />
            <SortableTableHead
              label="Statut"
              sortKey="status"
              activeSortKey={sortKey ?? undefined}
              sortState={sortState}
              onSort={() => handleSort("status")}
            />
            <SortableTableHead label="Actions" align="right" sortable={false} hideLabel />
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.id}</TableCell>
              <TableCell>{order.supplier}</TableCell>
              <TableCell>{order.channel}</TableCell>
              <TableCell>{formatDate(order.createdAt)}</TableCell>
              <TableCell>{formatDate(order.orderDate)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(order.total)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
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
                      <DropdownMenuItem onClick={() => handleEdit(order)}>
                        <Pencil />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download />
                        Télécharger
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger
                          nativeButton={false}
                          render={<DropdownMenuItem variant="destructive" />}
                        >
                          <Trash2 />
                          Supprimer
                        </AlertDialogTrigger>
                        <AlertDialogContent size="sm">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce bon de commande ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est définitive et supprimera la commande.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction variant="destructive">Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ProcurementOrderModal
        mode="edit"
        variant="purchase"
        open={editOpen}
        onOpenChange={handleEditOpenChange}
        order={activeOrder ?? undefined}
      />
    </>
  )
}
