import type { ReactNode } from "react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ContentCardProps = {
  title?: string
  description?: string
  actions?: ReactNode
  footer?: ReactNode
  className?: string
  contentClassName?: string
  children?: ReactNode
}

export function ContentCard({
  title,
  description,
  actions,
  footer,
  className,
  contentClassName,
  children,
}: ContentCardProps) {
  const showHeader = Boolean(title || description || actions)

  return (
    <Card className={cn("gap-0", className)}>
      {showHeader ? (
        <CardHeader>
          <div className="space-y-1">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <CardAction>{actions}</CardAction> : null}
        </CardHeader>
      ) : null}
      {children ? (
        <CardContent className={cn("text-sm", contentClassName)}>{children}</CardContent>
      ) : null}
      {footer ? <CardFooter className="justify-between">{footer}</CardFooter> : null}
    </Card>
  )
}
