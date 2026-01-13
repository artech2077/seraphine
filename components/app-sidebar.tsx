"use client"

import * as React from "react"
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
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { SearchCommand } from "@/components/search-command"
import { mainNavItems, utilityNavItems } from "@/lib/navigation"
import { usePathname } from "next/navigation"

export function AppSidebar() {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = React.useState(false)
  const renderLink = React.useCallback(
    (href: string) =>
      (props: React.ComponentPropsWithoutRef<"a"> & { type?: string }) => {
        const { type: _type, ...rest } = props
        return <Link href={href} {...rest} />
      },
    []
  )

  return (
    <>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="px-0 py-5">
          <div className="flex w-full items-center gap-2">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-semibold">
              S
            </div>
            <span className="text-base font-semibold tracking-tight min-w-0 w-full whitespace-nowrap transition-[width,opacity] duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden">
              Seraphine
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-0 py-3">
          <SidebarMenu className="gap-2">
            {mainNavItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                    className="pr-0"
                    render={renderLink(item.href)}
                  >
                    <item.icon />
                    <span className="min-w-0 w-full whitespace-nowrap transition-[width,opacity] duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden">
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
                    <span className="min-w-0 w-full whitespace-nowrap transition-[width,opacity] duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden">
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
                <span className="min-w-0 w-full whitespace-nowrap transition-[width,opacity] duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden">
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
