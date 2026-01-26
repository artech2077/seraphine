"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"
  const label = isDark ? "Passer en mode clair" : "Passer en mode sombre"
  const disableTransitions = React.useCallback(() => {
    const root = document.documentElement
    root.classList.add("theme-transitioning")
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        root.classList.remove("theme-transitioning")
      })
    })
  }, [])

  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="relative"
      disabled={!mounted}
      aria-label="Toggle dark mode"
      onClick={() => {
        disableTransitions()
        setTheme(isDark ? "light" : "dark")
      }}
    >
      <SunIcon
        className={cn(
          "absolute size-4 transition-all duration-200 ease-out",
          isDark ? "opacity-0 -rotate-90 scale-90" : "opacity-100 rotate-0 scale-100"
        )}
      />
      <MoonIcon
        className={cn(
          "absolute size-4 transition-all duration-200 ease-out",
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-90"
        )}
      />
      <span className="sr-only">Toggle dark mode</span>
    </Button>
  )

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="bottom" align="end">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
