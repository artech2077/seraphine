"use client"

import * as React from "react"

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
import type { SupplierFormValues } from "@/features/fournisseurs/api"
import { SupplierModal } from "@/features/fournisseurs/supplier-modal"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

export type Supplier = {
  id: string
  supplierNumber: string
  name: string
  email: string
  phone: string
  city: string
  balance: number
  notes?: string
}

type SupplierSortKey = "name" | "email" | "phone" | "city" | "balance"

type SupplierTableHeaderProps = {
  activeSortKey?: SupplierSortKey
  sortState?: "default" | "asc" | "desc"
  onSort?: (key: SupplierSortKey) => void
}

const balanceFormatter = new Intl.NumberFormat("fr-MA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatBalance(value: number) {
  return balanceFormatter.format(value)
}

function SupplierTableHeader({
  activeSortKey,
  sortState = "default",
  onSort,
}: SupplierTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <SortableTableHead
          label="Nom"
          sortKey="name"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("name")}
        />
        <SortableTableHead
          label="Email"
          sortKey="email"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("email")}
        />
        <SortableTableHead
          label="Telephone"
          sortKey="phone"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("phone")}
        />
        <SortableTableHead
          label="Ville"
          sortKey="city"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("city")}
        />
        <SortableTableHead
          label="Balance"
          align="right"
          sortKey="balance"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("balance")}
        />
        <SortableTableHead label="Actions" align="right" sortable={false} hideLabel />
      </TableRow>
    </TableHeader>
  )
}

export function SuppliersTable({
  items,
  page = 1,
  pageSize,
  onUpdate,
  onDelete,
}: {
  items: Supplier[]
  page?: number
  pageSize?: number
  onUpdate?: (item: Supplier, values: SupplierFormValues) => void | Promise<void>
  onDelete?: (item: Supplier) => void | Promise<void>
}) {
  type SortState = "default" | "asc" | "desc"

  const { canManage } = useRoleAccess()
  const canManageSuppliers = canManage("fournisseurs")
  const [sortKey, setSortKey] = React.useState<SupplierSortKey | null>(null)
  const [sortState, setSortState] = React.useState<SortState>("default")
  const [editOpen, setEditOpen] = React.useState(false)
  const [activeItem, setActiveItem] = React.useState<Supplier | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<Supplier | null>(null)

  const sortedItems = React.useMemo(() => {
    const next = [...items]
    if (sortState === "default" || !sortKey) {
      return next.reverse()
    }
    next.sort((a, b) => {
      let result = 0
      switch (sortKey) {
        case "balance":
          result = a.balance - b.balance
          break
        case "email":
          result = a.email.localeCompare(b.email, "fr")
          break
        case "phone":
          result = a.phone.localeCompare(b.phone, "fr")
          break
        case "city":
          result = a.city.localeCompare(b.city, "fr")
          break
        case "name":
        default:
          result = a.name.localeCompare(b.name, "fr")
      }
      return sortState === "asc" ? result : -result
    })
    return next
  }, [items, sortKey, sortState])

  const visibleItems = React.useMemo(() => {
    if (!pageSize) {
      return sortedItems
    }
    const start = (page - 1) * pageSize
    return sortedItems.slice(start, start + pageSize)
  }, [sortedItems, page, pageSize])

  function handleSort(nextKey: SupplierSortKey) {
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

  function handleEdit(item: Supplier) {
    setActiveItem(item)
    setEditOpen(true)
  }

  function handleEditOpenChange(nextOpen: boolean) {
    setEditOpen(nextOpen)
    if (!nextOpen) {
      setActiveItem(null)
    }
  }

  const handleDeleteRequest = React.useCallback((item: Supplier) => {
    setPendingDelete(item)
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

  function handleUpdate(values: SupplierFormValues) {
    if (!activeItem) return
    void onUpdate?.(activeItem, values)
  }

  return (
    <>
      <Table>
        <SupplierTableHeader
          activeSortKey={sortKey ?? undefined}
          sortState={sortState}
          onSort={(key) => handleSort(key)}
        />
        <TableBody>
          {visibleItems.map((item) => {
            const balanceClassName =
              item.balance > 0
                ? "text-primary"
                : item.balance < 0
                  ? "text-destructive"
                  : "text-muted-foreground"

            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>{item.phone}</TableCell>
                <TableCell>{item.city}</TableCell>
                <TableCell className={`text-right tabular-nums font-semibold ${balanceClassName}`}>
                  {formatBalance(item.balance)}
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
                          onClick={() => handleEdit(item)}
                          disabled={!canManageSuppliers}
                        >
                          <Pencil />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={!canManageSuppliers}
                          onClick={() => handleDeleteRequest(item)}
                        >
                          <Trash2 />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <AlertDialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est definitive et supprimera la fiche fournisseur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!canManageSuppliers || !onDelete || !pendingDelete}
              onClick={handleDeleteConfirm}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SupplierModal
        mode="edit"
        open={editOpen}
        onOpenChange={handleEditOpenChange}
        item={activeItem ?? undefined}
        onSubmit={handleUpdate}
      />
    </>
  )
}
