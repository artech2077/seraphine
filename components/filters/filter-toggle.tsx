"use client"

import * as React from "react"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FilterToggleProps = Omit<React.ComponentProps<typeof Switch>, "id" | "size"> & {
  id: string
  label: string
  className?: string
  size?: "sm" | "default"
}

export function FilterToggle({ id, label, className, size = "sm", ...props }: FilterToggleProps) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        buttonVariants({ variant: "outline" }),
        "bg-popover text-muted-foreground h-8 w-fit max-w-56 min-w-0 justify-between gap-2 px-3 font-normal rounded-md border-input cursor-pointer",
        className
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Switch id={id} size={size} {...props} />
    </Label>
  )
}
