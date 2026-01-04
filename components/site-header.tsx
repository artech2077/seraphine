"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { getPageTitle } from "@/lib/navigation"
import { usePathname } from "next/navigation"

export function SiteHeader() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="border-border flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mx-2 h-5 data-[orientation=vertical]:self-center"
      />
      <div className="text-base font-medium leading-none">{title}</div>
    </header>
  )
}
