"use client"

import * as React from "react"
import Image from "next/image"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileReport,
  IconHelp,
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
      url: "/app/ventes",
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
              className="w-full justify-start"
            >
              <a href="/app" className="flex w-full items-center">
                <Image
                  src="/Seraphine_logo.svg"
                  alt="Seraphine"
                  width={32}
                  height={32}
                  className="h-9 w-auto"
                  priority
                />
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
