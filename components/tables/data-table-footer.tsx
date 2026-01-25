"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type DataTableFooterProps = {
  rangeLabel: string
  pagination?: React.ReactNode
  itemsPerPageLabel?: string
  itemsPerPageOptions?: string[]
  itemsPerPageValue?: string
  itemsPerPageOnChange?: (value: string) => void
  selectId?: string
  className?: string
}

export function DataTableFooter({
  rangeLabel,
  pagination,
  itemsPerPageLabel = "Afficher",
  itemsPerPageOptions = ["20", "50", "100"],
  itemsPerPageValue = "20",
  itemsPerPageOnChange,
  selectId = "items-per-page",
  className,
}: DataTableFooterProps) {
  const selectProps = itemsPerPageOnChange
    ? {
        value: itemsPerPageValue,
        onValueChange: (value: string | null) => {
          if (value) {
            itemsPerPageOnChange(value)
          }
        },
      }
    : { defaultValue: itemsPerPageValue }

  return (
    <div className={cn("flex w-full flex-wrap items-center gap-3 text-sm", className)}>
      <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
        <span>{rangeLabel}</span>
        <div className="flex items-center gap-2">
          <Label htmlFor={selectId} className="text-muted-foreground">
            {itemsPerPageLabel}
          </Label>
          <Select {...selectProps}>
            <SelectTrigger id={selectId} className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "none" }}
            >
              {itemsPerPageOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>par page</span>
        </div>
      </div>
      {pagination ? <div className="ml-auto">{pagination}</div> : null}
    </div>
  )
}
