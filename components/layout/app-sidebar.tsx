"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { SearchIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SearchCommand } from "@/components/layout/search-command"
import { mainNavItems, utilityNavItems } from "@/lib/constants/navigation"
import { usePathname } from "next/navigation"

export function AppSidebar() {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = React.useState(false)
  const renderLink = React.useCallback((href: string) => {
    const LinkComponent = (props: React.ComponentPropsWithoutRef<"a">) => {
      return <Link href={href} {...props} />
    }
    LinkComponent.displayName = "SidebarLink"
    return LinkComponent
  }, [])

  return (
    <>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="px-0 py-3">
          <SidebarMenu className="gap-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                className="h-12 pl-0 pr-0 group-data-[collapsible=icon]:!p-0 hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent active:text-sidebar-foreground data-active:bg-transparent"
                render={renderLink("/app")}
              >
                <Image
                  src="/seraphine-logo-small.svg"
                  alt="Seraphine"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0"
                  priority
                />
                <span className="min-w-0 w-full whitespace-nowrap transition-all duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden">
                  <span className="block truncate text-sm font-semibold">La grande pharmacie</span>
                  <span className="block truncate text-xs text-sidebar-foreground/70">
                    Imintanout
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="px-0 py-3">
          <SidebarMenu className="gap-2">
            {mainNavItems.map((item) => {
              const isActive =
                item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href)

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                    className="pr-0"
                    render={renderLink(item.href)}
                  >
                    <item.icon />
                    <span className="min-w-0 w-full whitespace-nowrap transition-all duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden">
                      {item.title}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="mt-auto px-0 py-3">
          <SidebarMenu className="gap-2">
            {utilityNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href)

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                    className="pr-0"
                    render={renderLink(item.href)}
                  >
                    <item.icon />
                    <span className="min-w-0 w-full whitespace-nowrap transition-all duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden">
                      {item.title}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Recherche"
                className="pr-0"
                onClick={() => setSearchOpen(true)}
              >
                <SearchIcon />
                <span className="min-w-0 w-full whitespace-nowrap transition-all duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden">
                  Recherche
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
