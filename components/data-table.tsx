import * as React from "react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

type DataTableEmptyState = {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

type DataTableProps = {
  title?: string
  description?: string
  actions?: React.ReactNode
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  isEmpty?: boolean
  emptyState?: DataTableEmptyState
  children?: React.ReactNode
  className?: string
}

const fallbackEmptyState: DataTableEmptyState = {
  title: "Aucune donnee pour le moment",
  description: "Ajoutez un premier element pour demarrer.",
}

export function DataTable({
  title,
  description,
  actions,
  toolbar,
  footer,
  isEmpty = false,
  emptyState,
  children,
  className,
}: DataTableProps) {
  const showHeader = Boolean(title || description || actions)
  const showEmpty = isEmpty
  const resolvedEmptyState = emptyState ?? fallbackEmptyState

  return (
    <Card className={cn("gap-0", className)}>
      {showHeader ? (
        <CardHeader>
          <div className="space-y-1">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
          {actions ? <CardAction>{actions}</CardAction> : null}
        </CardHeader>
      ) : null}
      {toolbar ? (
        <CardContent className="py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {toolbar}
          </div>
        </CardContent>
      ) : null}
      {showEmpty ? (
        <CardContent>
          <Empty className="border border-dashed">
            <EmptyHeader>
              {resolvedEmptyState.icon ? (
                <EmptyMedia variant="icon">
                  {resolvedEmptyState.icon}
                </EmptyMedia>
              ) : null}
              <EmptyTitle>{resolvedEmptyState.title}</EmptyTitle>
              {resolvedEmptyState.description ? (
                <EmptyDescription>
                  {resolvedEmptyState.description}
                </EmptyDescription>
              ) : null}
            </EmptyHeader>
            {resolvedEmptyState.action ? (
              <EmptyContent>{resolvedEmptyState.action}</EmptyContent>
            ) : null}
          </Empty>
        </CardContent>
      ) : children ? (
        <CardContent className="px-2">{children}</CardContent>
      ) : null}
      {footer ? <CardFooter className="justify-between">{footer}</CardFooter> : null}
    </Card>
  )
}
