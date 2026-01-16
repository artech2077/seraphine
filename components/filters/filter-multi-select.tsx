"use client"

import * as React from "react"
import { ChevronDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"

type FilterMultiSelectProps = {
  label: string
  options: string[]
  className?: string
  onChange?: (values: string[]) => void
}

export function FilterMultiSelect({ label, options, className, onChange }: FilterMultiSelectProps) {
  const [values, setValues] = React.useState<string[]>([])
  const [isHovered, setIsHovered] = React.useState(false)

  const selectedCount = values.length
  const showClear = isHovered && selectedCount > 0
  const displayLabel = selectedCount === 1 ? values[0] : label

  const sortedOptions = React.useMemo(() => {
    const selectedSet = new Set(values)
    const selectedOptions = options
      .filter((option) => selectedSet.has(option))
      .sort((a, b) => a.localeCompare(b))
    const unselectedOptions = options
      .filter((option) => !selectedSet.has(option))
      .sort((a, b) => a.localeCompare(b))
    return [...selectedOptions, ...unselectedOptions]
  }, [options, values])

  const handleChange = React.useCallback(
    (nextValues: string[]) => {
      setValues(nextValues)
      onChange?.(nextValues)
    },
    [onChange]
  )

  const clearSelection = React.useCallback(
    (event: React.PointerEvent | React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      handleChange([])
    },
    [handleChange]
  )

  const indicator = (
    <span className="flex size-6 items-center justify-center">
      {showClear ? (
        <span
          role="button"
          aria-label={`Effacer ${label}`}
          className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-md"
          onPointerDown={clearSelection}
          onClick={clearSelection}
        >
          <XIcon className="size-4" />
        </span>
      ) : selectedCount > 1 ? (
        <span className="bg-accent text-foreground flex size-6 items-center justify-center rounded-full text-xs font-semibold">
          {selectedCount}
        </span>
      ) : (
        <ChevronDownIcon className="text-muted-foreground size-4" />
      )}
    </span>
  )

  return (
    <Select multiple value={values} onValueChange={handleChange}>
      <SelectTrigger
        className={cn("bg-popover rounded-md w-fit max-w-56 min-w-0", className)}
        indicator={indicator}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span
          className={cn("min-w-0 flex-1 truncate", selectedCount === 0 && "text-muted-foreground")}
        >
          {displayLabel}
        </span>
      </SelectTrigger>
      <SelectContent>
        {sortedOptions.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
