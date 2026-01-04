"use client"

import { SelectValue } from "@/components/ui/select"

type SelectValuePlaceholderProps = {
  placeholder: string
}

export function SelectValuePlaceholder({
  placeholder,
}: SelectValuePlaceholderProps) {
  return <SelectValue>{(value) => value ?? placeholder}</SelectValue>
}
