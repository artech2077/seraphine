"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useHydrated } from "@/hooks/use-hydrated"
import { usePrefetchRouteData } from "@/hooks/use-prefetch-route-data"
import { mainNavItems, utilityNavItems } from "@/lib/constants/navigation"
import { useRoleAccess } from "@/lib/auth/use-role-access"

type SearchCommandProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const router = useRouter()
  const hydrated = useHydrated()
  const { canView, canManageSettings } = useRoleAccess()
  const prefetchRoute = usePrefetchRouteData()

  const quickLinks = React.useMemo(() => {
    return [...mainNavItems, ...utilityNavItems].filter((item) => {
      if (item.href === "/app") return canView("dashboard")
      if (item.href.startsWith("/app/ventes")) return canView("ventes")
      if (item.href.startsWith("/app/produit")) return canView("inventaire")
      if (item.href.startsWith("/app/achats")) return canView("achats")
      if (item.href.startsWith("/app/fournisseurs")) return canView("fournisseurs")
      if (item.href.startsWith("/app/clients")) return canView("clients")
      if (item.href.startsWith("/app/reconciliation-caisse")) return canView("reconciliation")
      if (item.href.startsWith("/app/rapports")) return canView("rapports")
      if (item.href.startsWith("/app/analytique")) return canView("analytique")
      if (item.href.startsWith("/app/parametres")) {
        return canView("parametres") || canManageSettings
      }
      if (item.href.startsWith("/app/assistance")) return canView("assistance")
      return true
    })
  }, [canManageSettings, canView])

  if (!hydrated) {
    return null
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Recherche"
      description="Recherchez une page ou une section."
    >
      <Command>
        <CommandInput placeholder="Rechercher..." />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {quickLinks.map((item) => (
              <CommandItem
                key={item.title}
                onMouseEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
                onSelect={() => {
                  prefetchRoute(item.href)
                  onOpenChange(false)
                  router.push(item.href)
                }}
              >
                <item.icon />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
