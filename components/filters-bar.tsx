import * as React from "react"

import { Separator } from "@/components/ui/separator"

type FiltersBarProps = {
  label?: string
  children: React.ReactNode
}

export function FiltersBar({ label = "Filtres", children }: FiltersBarProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm font-medium">{label}</span>
      <Separator
        orientation="vertical"
        className="h-6 data-[orientation=vertical]:self-center"
      />
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  )
}
