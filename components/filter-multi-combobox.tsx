"use client"

import * as React from "react"
import { ChevronDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox"

type FilterMultiComboboxProps = {
  label: string
  options: string[]
  className?: string
  onChange?: (values: string[]) => void
}

export function FilterMultiCombobox({
  label,
  options,
  className,
  onChange,
}: FilterMultiComboboxProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [values, setValues] = React.useState<string[]>([])
  const [isHovered, setIsHovered] = React.useState(false)

  const selectedCount = values.length
  const showClear = isHovered && selectedCount > 0
  const displayLabel =
    selectedCount === 1 ? values[0] : label

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
        <span className="bg-muted text-foreground flex size-6 items-center justify-center rounded-full text-xs font-semibold">
          {selectedCount}
        </span>
      ) : (
        <ChevronDownIcon className="text-muted-foreground size-4" />
      )}
    </span>
  )

  return (
    <Combobox
      multiple
      items={sortedOptions}
      value={values}
      onValueChange={handleChange}
    >
      <ComboboxTrigger
        ref={triggerRef}
        indicator={indicator}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "bg-popover text-muted-foreground h-8 justify-between gap-2 px-3 font-normal rounded-md border-input",
          selectedCount > 0 && "text-foreground",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="truncate">{displayLabel}</span>
      </ComboboxTrigger>
      <ComboboxContent anchor={triggerRef}>
        <ComboboxInput
          placeholder="Rechercher..."
          showClear={false}
          showTrigger={false}
          className="rounded-md"
        />
        <ComboboxEmpty>Aucun résultat.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
