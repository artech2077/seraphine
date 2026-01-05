"use client"

import * as React from "react"

import {
  AccordionHeader,
  AccordionItemPlain,
  AccordionPanel,
  AccordionRoot,
  AccordionTriggerButton,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

type ExpandableTableProps = Omit<
  React.ComponentProps<typeof AccordionRoot>,
  "className" | "children"
> & {
  className?: string
  children: React.ReactNode
}

function ExpandableTable({
  className,
  multiple = true,
  children,
  ...props
}: ExpandableTableProps) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-md border border-border"
    >
      <AccordionRoot
        {...props}
        multiple={multiple}
        className={cn("w-full caption-bottom text-sm", className)}
        render={(rootProps) => (
          <table
            {...rootProps}
            data-slot="table"
            className={rootProps.className}
          />
        )}
      >
        {children}
      </AccordionRoot>
    </div>
  )
}

type ExpandableTableRowProps = {
  value: string
  row: React.ReactNode
  panel: React.ReactNode
  panelColSpan: number
  rowClassName?: string
  panelRowClassName?: string
  panelCellClassName?: string
  panelClassName?: string
  panelInnerClassName?: string
}

function ExpandableTableRow({
  value,
  row,
  panel,
  panelColSpan,
  rowClassName,
  panelRowClassName,
  panelCellClassName,
  panelClassName,
  panelInnerClassName,
}: ExpandableTableRowProps) {
  return (
    <AccordionItemPlain value={value} render={<tbody />}>
      <AccordionHeader render={<TableRow className={rowClassName} />}>
        {row}
      </AccordionHeader>
      <TableRow className={cn("bg-muted/40 border-0", panelRowClassName)}>
        <TableCell colSpan={panelColSpan} className={cn("p-0", panelCellClassName)}>
          <AccordionPanel className={cn(panelClassName)}>
            <div className={cn(panelInnerClassName)}>
              <div className="p-4">{panel}</div>
            </div>
          </AccordionPanel>
        </TableCell>
      </TableRow>
    </AccordionItemPlain>
  )
}

type ExpandableTableTriggerProps = {
  label: string
  className?: string
}

function ExpandableTableTrigger({
  label,
  className,
}: ExpandableTableTriggerProps) {
  return (
    <AccordionTriggerButton
      className={cn("group/expandable-trigger", className)}
      render={
        <Button variant="ghost" size="icon-xs" aria-label={label} />
      }
    >
      <ChevronDown className="transition-transform duration-300 ease-out group-data-[panel-open]/expandable-trigger:rotate-180" />
    </AccordionTriggerButton>
  )
}

export { ExpandableTable, ExpandableTableRow, ExpandableTableTrigger }
