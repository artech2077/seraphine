import * as React from "react"

type PageHeaderProps = {
  title: string
  description?: string
  actions?: React.ReactNode
  tabs?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  actions,
  tabs,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {tabs ? <div className="border-b border-border">{tabs}</div> : null}
    </div>
  )
}
