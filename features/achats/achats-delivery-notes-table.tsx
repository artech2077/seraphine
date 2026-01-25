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
} from "@/components/ui/alert-dialog"
import type { ProcurementFormValues } from "@/features/achats/api"
import { ProcurementOrderModal } from "@/features/achats/procurement-order-modal"
import type { DeliveryNote, DeliveryNoteStatus } from "@/features/achats/procurement-data"
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

function getStatusVariant(status: DeliveryNoteStatus) {
  switch (status) {
    case "Brouillon":
      return "secondary"
    case "En cours":
    default:
      return "outline"
    case "Livré":
      return "default"
  }
}

type DeliveryNotesTableProps = {
  notes: DeliveryNote[]
  page?: number
  pageSize?: number
  suppliers: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; unitPrice: number }>
  onUpdate?: (note: DeliveryNote, values: ProcurementFormValues) => void | Promise<void>
  onDelete?: (note: DeliveryNote) => void | Promise<void>
}

type DeliveryNotesSortKey =
  | "supplier"
  | "createdAt"
  | "orderDate"
  | "externalReference"
  | "total"
  | "status"

export function DeliveryNotesTable({
  notes,
  page = 1,
  pageSize,
  suppliers,
  products,
  onUpdate,
  onDelete,
}: DeliveryNotesTableProps) {
  type SortState = "default" | "asc" | "desc"

  const { canManage } = useRoleAccess()
  const canManagePurchases = canManage("achats")
  const [sortKey, setSortKey] = React.useState<DeliveryNotesSortKey | null>(null)
  const [sortState, setSortState] = React.useState<SortState>("default")
  const [editOpen, setEditOpen] = React.useState(false)
  const [activeNote, setActiveNote] = React.useState<DeliveryNote | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<DeliveryNote | null>(null)

  const sortedNotes = React.useMemo(() => {
    const next = [...notes]
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
        case "externalReference":
          result = a.externalReference.localeCompare(b.externalReference, "fr")
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
  }, [notes, sortKey, sortState])

  const visibleNotes = React.useMemo(() => {
    if (!pageSize) return sortedNotes
    const start = (page - 1) * pageSize
    return sortedNotes.slice(start, start + pageSize)
  }, [page, pageSize, sortedNotes])

  function handleSort(nextKey: DeliveryNotesSortKey) {
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

  function handleEdit(note: DeliveryNote) {
    setActiveNote(note)
    setEditOpen(true)
  }

  function handleEditOpenChange(nextOpen: boolean) {
    setEditOpen(nextOpen)
    if (!nextOpen) {
      setActiveNote(null)
    }
  }

  const handleDeleteRequest = React.useCallback((note: DeliveryNote) => {
    setPendingDelete(note)
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
    if (!activeNote) return
    void onUpdate?.(activeNote, values)
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
              label="Réf livraison"
              sortKey="externalReference"
              activeSortKey={sortKey ?? undefined}
              sortState={sortState}
              onSort={() => handleSort("externalReference")}
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
          {visibleNotes.map((note) => (
            <TableRow key={note.id}>
              <TableCell className="font-medium">{note.orderNumber}</TableCell>
              <TableCell>{note.supplier}</TableCell>
              <TableCell>{formatDate(note.createdAt)}</TableCell>
              <TableCell>{formatDate(note.orderDate)}</TableCell>
              <TableCell>{note.externalReference}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(note.total)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(note.status)}>{note.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
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
                        onClick={() => handleEdit(note)}
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
                        onClick={() => handleDeleteRequest(note)}
                      >
                        <Trash2 />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AlertDialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bon de livraison ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive et supprimera le bon de livraison.
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
        variant="delivery"
        open={editOpen}
        onOpenChange={handleEditOpenChange}
        order={activeNote ?? undefined}
        suppliers={suppliers}
        products={products}
        onSubmit={handleUpdate}
      />
    </>
  )
}
