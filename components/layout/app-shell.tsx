"use client"

import * as React from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { LowStockAlert } from "@/features/alerts/low-stock-alert"
import { useEnsurePharmacy } from "@/hooks/use-ensure-pharmacy"

export function AppShell({ children }: { children: React.ReactNode }) {
  useEnsurePharmacy()

  return (
    <SidebarProvider defaultOpen className="bg-sidebar">
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <LowStockAlert />
        <main className="flex flex-1 flex-col p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
