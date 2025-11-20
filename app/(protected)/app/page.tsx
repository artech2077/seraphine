import { currentUser } from "@clerk/nextjs/server"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "./_components/dashboard-header"
import { DashboardOverview } from "./_components/dashboard-overview"
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

export default async function AppHomePage() {
  const user = await currentUser()
  if (!user) {
    return null
  }

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
        <DashboardHeader title="Tableau de bord" />
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-8">
          {pharmacyId ? (
            <DashboardOverview pharmacyId={pharmacyId} role={userRole} />
          ) : (
            <Card className="text-center">
              <CardHeader className="gap-2">
                <CardTitle>Aucune pharmacie associée</CardTitle>
                <CardDescription>
                  Demandez à l’administrateur de vous inviter dans l’organisation Clerk afin d’accéder au tableau de bord.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <ModulePlaceholder
              id="ventes"
              title="Module Ventes"
              description="Interface POS-like avec lignes de vente, remises et paiements (à venir)."
            />
            <ModulePlaceholder
              id="inventaire"
              title="Inventaire"
              description="Suivi des seuils, catégories et réassorts en temps réel."
            />
            <ModulePlaceholder
              id="fournisseurs"
              title="Fournisseurs"
              description="Gestion des partenaires et balances automatisées."
            />
            <ModulePlaceholder
              id="clients"
              title="Clients"
              description="Portefeuille clients et suivi des comptes à crédit."
            />
            <ModulePlaceholder
              id="rapports"
              title="Rapports"
              description="Exports financiers, analytics et réconciliation (bientôt)."
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function ModulePlaceholder({
  id,
  title,
  description,
}: {
  id: string
  title: string
  description: string
}) {
  return (
    <Card id={id} className="h-full">
      <CardHeader className="gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Bientôt disponible
        </p>
        <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
