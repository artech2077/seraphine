"use client"

import * as React from "react"
import { format } from "date-fns"
import { MoreHorizontal, Pencil } from "lucide-react"

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
  SortableTableHead,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type ReconciliationHistoryItem = {
  id: string
  date: string
  opening: number
  expected: number
  counted: number
}

type ReconciliationStatus = "Validé" | "Écart" | "Excédent"

type ReconciliationSortKey = "date" | "opening" | "expected" | "counted" | "difference" | "status"

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function formatDate(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, "dd/MM/yyyy")
}

function getStatus(difference: number): ReconciliationStatus {
  if (difference === 0) return "Validé"
  if (difference < 0) return "Écart"
  return "Excédent"
}

function getStatusOrder(status: ReconciliationStatus) {
  switch (status) {
    case "Validé":
      return 1
    case "Écart":
      return 2
    case "Excédent":
      return 3
    default:
      return 4
  }
}

function getStatusVariant(status: ReconciliationStatus) {
  switch (status) {
    case "Validé":
      return "success"
    case "Écart":
      return "destructive"
    case "Excédent":
      return "warning"
    default:
      return "secondary"
  }
}

export function ReconciliationHistoryTable({ items }: { items: ReconciliationHistoryItem[] }) {
  type SortState = "default" | "asc" | "desc"

  const [sortKey, setSortKey] = React.useState<ReconciliationSortKey | null>(null)
  const [sortState, setSortState] = React.useState<SortState>("default")

  const sortedItems = React.useMemo(() => {
    const next = [...items]
    if (!sortKey || sortState === "default") {
      return next
    }

    next.sort((a, b) => {
      const diffA = a.counted - a.expected
      const diffB = b.counted - b.expected
      let result = 0

      switch (sortKey) {
        case "date":
          result = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case "opening":
          result = a.opening - b.opening
          break
        case "expected":
          result = a.expected - b.expected
          break
        case "counted":
          result = a.counted - b.counted
          break
        case "difference":
          result = diffA - diffB
          break
        case "status":
          result = getStatusOrder(getStatus(diffA)) - getStatusOrder(getStatus(diffB))
          break
        default:
          break
      }

      return sortState === "asc" ? result : -result
    })

    return next
  }, [items, sortKey, sortState])

  function handleSort(nextKey: ReconciliationSortKey) {
    if (sortKey !== nextKey) {
      setSortKey(nextKey)
      setSortState("asc")
      return
    }

    setSortState((current) => (current === "asc" ? "desc" : current === "desc" ? "default" : "asc"))
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead
            label="Date"
            sortKey="date"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("date")}
          />
          <SortableTableHead
            label="Ouverture"
            align="right"
            sortKey="opening"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("opening")}
          />
          <SortableTableHead
            label="Attendu"
            align="right"
            sortKey="expected"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("expected")}
          />
          <SortableTableHead
            label="Compté"
            align="right"
            sortKey="counted"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("counted")}
          />
          <SortableTableHead
            label="Écart"
            align="right"
            sortKey="difference"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("difference")}
          />
          <SortableTableHead
            label="Statut"
            sortKey="status"
            activeSortKey={sortKey ?? undefined}
            sortState={sortState}
            onSort={() => handleSort("status")}
          />
          <SortableTableHead label="Actions" sortable={false} hideLabel align="right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedItems.map((item) => {
          const difference = item.counted - item.expected
          const status = getStatus(difference)

          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{formatDate(item.date)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(item.opening)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(item.expected)}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCurrency(item.counted)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(Math.abs(difference))}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(status)}>{status}</Badge>
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
                      <DropdownMenuItem>
                        <Pencil />
                        Modifier
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
  )
}
