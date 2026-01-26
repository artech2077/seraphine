"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="theme-toggle" className="text-sm text-muted-foreground">
        Dark mode
      </Label>
      <Switch
        id="theme-toggle"
        size="sm"
        checked={isDark}
        disabled={!mounted}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
    </div>
  )
}
