"use client"

import * as React from "react"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-md border border-border"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "bg-muted/40 [&_tr]:border-b [&_tr]:hover:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("bg-background border-t font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors", className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  )
}

type SortableTableHeadProps = React.ComponentProps<"th"> & {
  label: string
  align?: "left" | "center" | "right"
  hideLabel?: boolean
  sortable?: boolean
  sortKey?: string
  activeSortKey?: string
  sortState?: "default" | "asc" | "desc"
  onSort?: (key: string) => void
}

function SortableTableHead({
  label,
  align = "left",
  hideLabel = false,
  sortable = true,
  sortKey,
  activeSortKey,
  sortState = "default",
  onSort,
  className,
  ...props
}: SortableTableHeadProps) {
  const alignment =
    align === "right"
      ? "justify-end text-right"
      : align === "center"
        ? "justify-center text-center"
        : "justify-start text-left"

  const isActive = Boolean(sortKey && sortKey === activeSortKey)
  const isSorted = isActive && sortState !== "default"
  const ariaSort =
    isActive && sortState !== "default"
      ? sortState === "asc"
        ? "ascending"
        : "descending"
      : "none"

  return (
    <TableHead className={className} aria-sort={ariaSort} {...props}>
      {sortable ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-full gap-2 border-0 px-0 hover:bg-transparent hover:text-current",
            alignment,
            isSorted ? "text-foreground" : "text-muted-foreground"
          )}
          aria-label={`Trier par ${label}`}
          onClick={() => {
            if (sortKey && onSort) {
              onSort(sortKey)
            }
          }}
        >
          <span className={cn("truncate", hideLabel && "sr-only")}>{label}</span>
          {isSorted ? (
            sortState === "asc" ? (
              <ArrowUp className="text-muted-foreground" />
            ) : (
              <ArrowDown className="text-muted-foreground" />
            )
          ) : (
            <ArrowUpDown className="text-muted-foreground" />
          )}
        </Button>
      ) : (
        <div className={cn("flex h-8 w-full items-center gap-2 px-0", alignment)}>
          <span className={cn("truncate text-foreground", hideLabel && "sr-only")}>
            {label}
          </span>
        </div>
      )}
    </TableHead>
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  SortableTableHead,
  TableRow,
  TableCell,
  TableCaption,
}
