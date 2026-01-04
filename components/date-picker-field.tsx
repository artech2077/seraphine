"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, XIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type DatePickerFieldProps = {
  placeholder: string
  className?: string
}

export function DatePickerField({
  placeholder,
  className,
}: DatePickerFieldProps) {
  const [range, setRange] = React.useState<DateRange | undefined>()
  const [isHovered, setIsHovered] = React.useState(false)

  const hasSelection = Boolean(range?.from)
  const showClear = isHovered && hasSelection

  const label = React.useMemo(() => {
    if (!range?.from) return placeholder
    if (!range.to) {
      return format(range.from, "dd/MM/yyyy")
    }
    return `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`
  }, [placeholder, range])

  const clearSelection = React.useCallback(
    (event: React.PointerEvent | React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setRange(undefined)
    },
    []
  )

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "bg-popover text-muted-foreground h-8 justify-between gap-2 px-3 text-left font-normal rounded-md border-input",
          hasSelection && "text-foreground",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="truncate">{label}</span>
        <span className="flex size-6 items-center justify-center">
          {showClear ? (
            <span
              role="button"
              aria-label="Effacer la date"
              className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-md"
              onPointerDown={clearSelection}
              onClick={clearSelection}
            >
              <XIcon className="size-4" />
            </span>
          ) : (
            <CalendarIcon className="text-muted-foreground size-4" />
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar mode="range" selected={range} onSelect={setRange} />
      </PopoverContent>
    </Popover>
  )
}
