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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table"
import { InventoryProductModal } from "@/components/inventory-product-modal"
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
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

export type InventoryItem = {
  id: string
  name: string
  barcode?: string
  supplier?: string
  stock: number
  threshold: number
  purchasePrice: number
  sellingPrice: number
  vatRate: number
  category: string
  dosageForm: string
}

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

type InventorySortKey =
  | "name"
  | "barcode"
  | "stock"
  | "threshold"
  | "purchasePrice"
  | "sellingPrice"
  | "vatRate"
  | "category"
  | "dosageForm"

type InventoryTableHeaderProps = {
  activeSortKey?: InventorySortKey
  sortState?: "default" | "asc" | "desc"
  onSort?: (key: InventorySortKey) => void
}

function InventoryTableHeader({
  activeSortKey,
  sortState = "default",
  onSort,
}: InventoryTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <SortableTableHead
          label="Produits"
          sortKey="name"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("name")}
        />
        <SortableTableHead
          label="Stock"
          align="right"
          sortKey="stock"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("stock")}
        />
        <SortableTableHead
          label="Seuil"
          align="right"
          sortKey="threshold"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("threshold")}
        />
        <SortableTableHead
          label="Prix d'achat"
          align="right"
          sortKey="purchasePrice"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("purchasePrice")}
        />
        <SortableTableHead
          label="Prix de vente"
          align="right"
          sortKey="sellingPrice"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("sellingPrice")}
        />
        <SortableTableHead
          label="TVA"
          align="right"
          sortKey="vatRate"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("vatRate")}
        />
        <SortableTableHead
          label="Categorie"
          sortKey="category"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("category")}
        />
        <SortableTableHead
          label="Forme galenique"
          sortKey="dosageForm"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("dosageForm")}
        />
        <SortableTableHead
          label="Code barre"
          sortKey="barcode"
          activeSortKey={activeSortKey}
          sortState={sortState}
          onSort={() => onSort?.("barcode")}
        />
        <SortableTableHead
          label="Actions"
          align="right"
          sortable={false}
          hideLabel
        />
      </TableRow>
    </TableHeader>
  )
}

export function InventoryTable({
  items,
  page = 1,
  pageSize,
}: {
  items: InventoryItem[]
  page?: number
  pageSize?: number
}) {
  type SortState = "default" | "asc" | "desc"

  const [sortKey, setSortKey] = React.useState<InventorySortKey | null>(null)
  const [sortState, setSortState] = React.useState<SortState>("default")
  const [editOpen, setEditOpen] = React.useState(false)
  const [activeItem, setActiveItem] = React.useState<InventoryItem | null>(null)

  const sortedItems = React.useMemo(() => {
    const next = [...items]
    if (sortState === "default" || !sortKey) {
      return next.reverse()
    }
    next.sort((a, b) => {
      let result = 0
      switch (sortKey) {
        case "stock":
          result = a.stock - b.stock
          break
        case "threshold":
          result = a.threshold - b.threshold
          break
        case "purchasePrice":
          result = a.purchasePrice - b.purchasePrice
          break
        case "sellingPrice":
          result = a.sellingPrice - b.sellingPrice
          break
        case "vatRate":
          result = a.vatRate - b.vatRate
          break
        case "barcode":
          result = (a.barcode ?? "").localeCompare(b.barcode ?? "", "fr")
          break
        case "category":
          result = a.category.localeCompare(b.category, "fr")
          break
        case "dosageForm":
          result = a.dosageForm.localeCompare(b.dosageForm, "fr")
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

  function handleSort(nextKey: InventorySortKey) {
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

  function handleEdit(item: InventoryItem) {
    setActiveItem(item)
    setEditOpen(true)
  }

  function handleEditOpenChange(nextOpen: boolean) {
    setEditOpen(nextOpen)
    if (!nextOpen) {
      setActiveItem(null)
    }
  }

  return (
    <>
      <Table>
        <InventoryTableHeader
          activeSortKey={sortKey ?? undefined}
          sortState={sortState}
          onSort={(key) => handleSort(key)}
        />
        <TableBody>
          {visibleItems.map((item) => {
            const isLowStock = item.stock <= item.threshold
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={isLowStock ? "destructive" : "success"}
                    className="min-w-10 justify-center tabular-nums"
                  >
                    {item.stock}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.threshold}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(item.purchasePrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(item.sellingPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.vatRate}%
                </TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.dosageForm}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.barcode ?? "-"}
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
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Pencil />
                          Modifier
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
                              <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est definitive et supprimera la fiche produit.
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
            )
          })}
        </TableBody>
      </Table>
      <InventoryProductModal
        mode="edit"
        open={editOpen}
        onOpenChange={handleEditOpenChange}
        item={activeItem ?? undefined}
      />
    </>
  )
}

export function InventoryTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Table>
      <InventoryTableHeader />
      <TableBody>
        {Array.from({ length: rows }).map((_, index) => (
          <TableRow key={`inventory-skeleton-${index}`}>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Skeleton className="h-4 w-10" />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-8" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-16" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-16" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-10" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
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
