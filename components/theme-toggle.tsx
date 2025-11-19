"use client"

import { useCallback, useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

type ThemePreference = "light" | "dark"

const STORAGE_KEY = "seraphine-theme"

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement
  if (theme === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

function resolveInitialTheme(): ThemePreference {
  if (typeof window === "undefined") {
    return "light"
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "light" || stored === "dark") {
    return stored
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const initial = resolveInitialTheme()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark"
      applyTheme(next)
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  const icon = theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
  const label = theme === "dark" ? "Mode clair" : "Mode sombre"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
      aria-label={label}
      title={label}
      disabled={!mounted}
    >
      {icon}
    </Button>
  )
}
