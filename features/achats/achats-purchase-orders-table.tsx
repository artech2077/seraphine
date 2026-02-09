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
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ProcurementFormValues } from "@/features/achats/api"
import { ProcurementOrderModal } from "@/features/achats/procurement-order-modal"
import type {
  ProductOption,
  PurchaseOrder,
  PurchaseOrderStatus,
} from "@/features/achats/procurement-data"
import { useRoleAccess } from "@/lib/auth/use-role-access"
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

type PurchaseOrdersTableProps = {
  orders: PurchaseOrder[]
  page?: number
  pageSize?: number
  suppliers: Array<{ id: string; name: string }>
  products: ProductOption[]
  onCreateDelivery?: (order: PurchaseOrder) => void | Promise<void>
  onUpdate?: (order: PurchaseOrder, values: ProcurementFormValues) => void | Promise<void>
  onDelete?: (order: PurchaseOrder) => void | Promise<void>
}

type PurchaseOrdersSortKey = "supplier" | "createdAt" | "orderDate" | "total" | "status"

function getStatusVariant(status: PurchaseOrderStatus) {
  switch (status) {
    case "Brouillon":
      return "secondary"
    case "Commandé":
    default:
      return "default"
  }
}

type PurchaseOrdersTableHeaderProps = {
  activeSortKey?: PurchaseOrdersSortKey
  sortState?: "default" | "asc" | "desc"
  onSort?: (key: PurchaseOrdersSortKey) => void
}

function PurchaseOrdersTableHeader({
  activeSortKey,
  sortState = "default",
  onSort,
}: PurchaseOrdersTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <SortableTableHead label="ID" sortable={false} />
        <SortableTableHead
          label="Fournisseur"
          sortKey="supplier"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("supplier")}
        />
        <SortableTableHead
          label="Date de création"
          sortKey="createdAt"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("createdAt")}
        />
        <SortableTableHead
          label="Date du bon"
          sortKey="orderDate"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("orderDate")}
        />
        <SortableTableHead
          label="Total"
          align="right"
          sortKey="total"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("total")}
        />
        <SortableTableHead
          label="Statut"
          sortKey="status"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("status")}
        />
        <SortableTableHead label="Actions" align="right" sortable={false} hideLabel />
      </TableRow>
    </TableHeader>
  )
}

export function PurchaseOrdersTable({
  orders,
  page = 1,
  pageSize,
  suppliers,
  products,
  onCreateDelivery,
  onUpdate,
  onDelete,
}: PurchaseOrdersTableProps) {
  type SortState = "default" | "asc" | "desc"

  const { canManage } = useRoleAccess()
  const canManagePurchases = canManage("achats")
  const [sortKey, setSortKey] = React.useState<PurchaseOrdersSortKey | null>(null)
  const [sortState, setSortState] = React.useState<SortState>("default")
  const [editOpen, setEditOpen] = React.useState(false)
  const [activeOrder, setActiveOrder] = React.useState<PurchaseOrder | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<PurchaseOrder | null>(null)

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
          result = a.status.localeCompare(b.status, "fr")
          break
        default:
          result = 0
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

  const handleDeleteRequest = React.useCallback((order: PurchaseOrder) => {
    setPendingDelete(order)
    setDeleteOpen(true)
  }, [])

  const handleDeleteOpenChange = React.useCallback((open: boolean) => {
    setDeleteOpen(open)
    if (!open) {
      setPendingDelete(null)
    }
  }, [])

  const handleDeleteConfirm = React.useCallback(() => {
    if (!pendingDelete || !onDelete) return
    void Promise.resolve()
      .then(() => onDelete(pendingDelete))
      .then(() => setDeleteOpen(false))
      .catch(() => null)
  }, [onDelete, pendingDelete])

  function handleUpdate(values: ProcurementFormValues) {
    if (!activeOrder) return
    void onUpdate?.(activeOrder, values)
  }

  function handleCreateDelivery(order: PurchaseOrder) {
    if (!onCreateDelivery) return
    void onCreateDelivery(order)
  }

  return (
    <>
      <Table>
        <PurchaseOrdersTableHeader
          activeSortKey={sortKey ?? undefined}
          sortState={sortState}
          onSort={handleSort}
        />
        <TableBody>
          {visibleOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.orderNumber}</TableCell>
              <TableCell>{order.supplier}</TableCell>
              <TableCell>{formatDate(order.createdAt)}</TableCell>
              <TableCell>{formatDate(order.orderDate)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(order.total)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  {order.status === "Commandé" && onCreateDelivery ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canManagePurchases}
                      onClick={() => handleCreateDelivery(order)}
                    >
                      Créer BL
                    </Button>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon" aria-label="Ouvrir le menu" />}
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleEdit(order)}
                          disabled={!canManagePurchases}
                        >
                          <Pencil />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download />
                          Télécharger
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={!canManagePurchases}
                          onClick={() => handleDeleteRequest(order)}
                        >
                          <Trash2 />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AlertDialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bon de commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive et supprimera la commande.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!canManagePurchases || !onDelete || !pendingDelete}
              onClick={handleDeleteConfirm}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ProcurementOrderModal
        mode="edit"
        variant="purchase"
        open={editOpen}
        onOpenChange={handleEditOpenChange}
        order={activeOrder ?? undefined}
        suppliers={suppliers}
        products={products}
        onSubmit={handleUpdate}
      />
    </>
  )
}

export function PurchaseOrdersTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Table>
      <PurchaseOrdersTableHeader />
      <TableBody>
        {Array.from({ length: rows }).map((_, index) => (
          <TableRow key={`purchase-orders-skeleton-${index}`}>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-8 w-8" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
