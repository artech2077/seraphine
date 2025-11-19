import { currentUser } from "@clerk/nextjs/server"

import { DashboardOverview } from "./_components/dashboard-overview"
import { ensurePharmacyAccess } from "@/lib/pharmacies/bootstrap"
import { supabaseAdminClient } from "@/lib/supabase/admin"
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
    <section className="mx-auto w-full max-w-5xl space-y-6 px-6 py-12">
      <div className="rounded-3xl border border-border bg-card/80 p-8 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Espace sécurisé</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bienvenue, {user?.firstName ?? "pharmacien·ne"}</h1>
        <p className="mt-4 text-base text-muted-foreground">
          Retrouvez ci-dessous vos indicateurs clés (ventes, alertes, projections) mis à jour via Supabase et
          protégés par Clerk.
        </p>
      </div>

      {pharmacyId ? (
        <DashboardOverview pharmacyId={pharmacyId} role={userRole} />
      ) : (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/60 p-8 text-center shadow-sm">
          <p className="text-base font-medium">Aucune pharmacie associée</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Demandez à l’administrateur de vous inviter dans l’organisation Clerk afin d’accéder au tableau de bord.
          </p>
        </div>
      )}
    </section>
  )
}
