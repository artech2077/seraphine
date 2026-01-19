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
import type { ClientFormValues } from "@/features/clients/api"
import { ClientModal } from "@/features/clients/client-modal"
import { useRoleAccess } from "@/lib/auth/use-role-access"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

export type ClientStatus = "OK" | "Surveillé" | "Bloqué"

export type Client = {
  id: string
  name: string
  phone: string
  city: string
  plafond: number
  encours: number
  status: ClientStatus
  lastPurchase: string
  notes?: string
}

type ClientSortKey = "name" | "phone" | "plafond" | "encours" | "status" | "lastPurchase"

type ClientTableHeaderProps = {
  activeSortKey?: ClientSortKey
  sortState?: "default" | "asc" | "desc"
  onSort?: (key: ClientSortKey) => void
}

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const statusOrder: Record<ClientStatus, number> = {
  OK: 1,
  Surveillé: 2,
  Bloqué: 3,
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function formatDate(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return dateFormatter.format(new Date(parsed))
}

function getStatusVariant(status: ClientStatus) {
  switch (status) {
    case "OK":
      return "success"
    case "Bloqué":
      return "destructive"
    case "Surveillé":
    default:
      return "secondary"
  }
}

function ClientTableHeader({
  activeSortKey,
  sortState = "default",
  onSort,
}: ClientTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <SortableTableHead
          label="Clients"
          sortKey="name"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("name")}
        />
        <SortableTableHead
          label="Téléphone"
          sortKey="phone"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("phone")}
        />
        <SortableTableHead
          label="Plafond"
          align="right"
          sortKey="plafond"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("plafond")}
        />
        <SortableTableHead
          label="Encours"
          align="right"
          sortKey="encours"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("encours")}
        />
        <SortableTableHead
          label="Statut"
          sortKey="status"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("status")}
        />
        <SortableTableHead
          label="Dernier achat"
          sortKey="lastPurchase"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("lastPurchase")}
        />
        <SortableTableHead label="Actions" align="right" sortable={false} hideLabel />
      </TableRow>
    </TableHeader>
  )
}

export function ClientsTable({
  items,
  page = 1,
  pageSize,
  onUpdate,
  onDelete,
}: {
  items: Client[]
  page?: number
  pageSize?: number
  onUpdate?: (item: Client, values: ClientFormValues) => void | Promise<void>
  onDelete?: (item: Client) => void | Promise<void>
}) {
  type SortState = "default" | "asc" | "desc"

  const { canManage } = useRoleAccess()
  const canManageClients = canManage("clients")
  const [sortKey, setSortKey] = React.useState<ClientSortKey | null>(null)
  const [sortState, setSortState] = React.useState<SortState>("default")
  const [editOpen, setEditOpen] = React.useState(false)
  const [activeItem, setActiveItem] = React.useState<Client | null>(null)

  const sortedItems = React.useMemo(() => {
    const next = [...items]
    if (!sortKey || sortState === "default") {
      return next
    }
    next.sort((a, b) => {
      let result = 0
      switch (sortKey) {
        case "plafond":
          result = a.plafond - b.plafond
          break
        case "encours":
          result = a.encours - b.encours
          break
        case "phone":
          result = a.phone.localeCompare(b.phone, "fr")
          break
        case "status":
          result = statusOrder[a.status] - statusOrder[b.status]
          break
        case "lastPurchase":
          result = Date.parse(a.lastPurchase) - Date.parse(b.lastPurchase)
          break
        case "name":
        default:
          result = a.name.localeCompare(b.name, "fr")
          break
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

  function handleSort(nextKey: ClientSortKey) {
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

  function handleEdit(item: Client) {
    setActiveItem(item)
    setEditOpen(true)
  }

  function handleEditOpenChange(nextOpen: boolean) {
    setEditOpen(nextOpen)
    if (!nextOpen) {
      setActiveItem(null)
    }
  }

  function handleUpdate(values: ClientFormValues) {
    if (!activeItem) return
    void onUpdate?.(activeItem, values)
  }

  return (
    <>
      <Table>
        <ClientTableHeader
          activeSortKey={sortKey ?? undefined}
          sortState={sortState}
          onSort={(key) => handleSort(key)}
        />
        <TableBody>
          {visibleItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.phone}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(item.plafond)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {formatCurrency(item.encours)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
              </TableCell>
              <TableCell>{formatDate(item.lastPurchase)}</TableCell>
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
                        disabled={!canManageClients}
                      >
                        <Pencil />
                        Modifier
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger
                          nativeButton={false}
                          disabled={!canManageClients}
                          render={
                            <DropdownMenuItem variant="destructive" disabled={!canManageClients} />
                          }
                        >
                          <Trash2 />
                          Supprimer
                        </AlertDialogTrigger>
                        <AlertDialogContent size="sm">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est definitive et supprimera la fiche client.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              disabled={!canManageClients || !onDelete}
                              onClick={() => onDelete?.(item)}
                            >
                              Supprimer
                            </AlertDialogAction>
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
      <ClientModal
        mode="edit"
        open={editOpen}
        onOpenChange={handleEditOpenChange}
        item={activeItem ?? undefined}
        onSubmit={handleUpdate}
      />
    </>
  )
}
