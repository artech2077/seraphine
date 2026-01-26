"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

type FilterComboboxProps = Omit<React.ComponentProps<typeof Combobox>, "children" | "items"> & {
  items: string[]
  placeholder: string
  emptyText?: string
  inputClassName?: string
}

export function FilterCombobox({
  items,
  placeholder,
  emptyText = "Aucun résultat.",
  inputClassName,
  ...props
}: FilterComboboxProps) {
  return (
    <Combobox items={items} {...props}>
      <ComboboxInput
        placeholder={placeholder}
        className={cn("bg-popover rounded-md", inputClassName)}
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
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
