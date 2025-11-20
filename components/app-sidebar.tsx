"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileReport,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReceipt2,
  IconSearch,
  IconSettings,
  IconShoppingBag,
  IconUsers,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Tableau de bord",
      url: "/app",
      icon: IconDashboard,
    },
    {
      title: "Ventes",
      url: "#ventes",
      icon: IconShoppingBag,
    },
    {
      title: "Inventaire",
      url: "#inventaire",
      icon: IconDatabase,
    },
    {
      title: "Fournisseurs",
      url: "#fournisseurs",
      icon: IconListDetails,
    },
    {
      title: "Clients",
      url: "#clients",
      icon: IconUsers,
    },
  ],
  navSecondary: [
    {
      title: "Paramètres",
      url: "#settings",
      icon: IconSettings,
    },
    {
      title: "Assistance",
      url: "#support",
      icon: IconHelp,
    },
    {
      title: "Recherche",
      url: "#search",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Réconciliation caisse",
      url: "#caisse",
      icon: IconReceipt2,
    },
    {
      name: "Rapports",
      url: "#rapports",
      icon: IconFileReport,
    },
    {
      name: "Analytique",
      url: "#analytique",
      icon: IconChartBar,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/app">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Seraphine</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}
