import { currentUser } from "@clerk/nextjs/server"

import { InventoryTable } from "@/components/inventory/inventory-table"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "../_components/dashboard-header"
import { ensurePharmacyAccess } from "@/lib/pharmacies/bootstrap"
import { supabaseAdminClient } from "@/lib/supabase/admin"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { Database } from "@/types/database"

export default async function InventoryPage() {
  const user = await currentUser()
  if (!user) return null

  const profileResult = await supabaseAdminClient
    .from("users")
    .select("id, pharmacy_id, role")
    .eq("clerk_id", user.id)
    .maybeSingle()

  if (profileResult.error) {
    console.error("Impossible de récupérer le profil utilisateur", profileResult.error)
  }

  let profile = profileResult.data

  if (!profile?.pharmacy_id) {
    await ensurePharmacyAccess(user)
    const refreshed = await supabaseAdminClient
      .from("users")
      .select("id, pharmacy_id, role")
      .eq("clerk_id", user.id)
      .maybeSingle()

    if (!refreshed.error) {
      profile = refreshed.data ?? profile
    }
  }

  const pharmacyId = profile?.pharmacy_id ?? null
  const userRole = (profile?.role as Database["public"]["Enums"]["user_role"]) ?? "restricted"
  void userRole

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-background">
        <DashboardHeader title="Inventaire" />
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-8">
          {pharmacyId ? <InventoryTable /> : <MissingPharmacyCard />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function MissingPharmacyCard() {
  return (
    <Card className="text-center">
      <CardHeader className="gap-2">
        <CardTitle>Aucune pharmacie associée</CardTitle>
        <CardDescription>
          Demandez à l’administrateur de vous inviter dans l’organisation Clerk afin d’accéder au module Inventaire.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
