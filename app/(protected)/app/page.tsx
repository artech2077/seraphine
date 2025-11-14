import { currentUser } from "@clerk/nextjs/server"

export default async function AppHomePage() {
  const user = await currentUser()

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-6 py-12">
      <div className="rounded-3xl border border-border bg-card/80 p-8 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Espace sécurisé</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bienvenue, {user?.firstName ?? "pharmacien·ne"}</h1>
        <p className="mt-4 text-base text-muted-foreground">
          Cette zone sera prochainement remplacée par le tableau de bord opérationnel (ventes, stocks,
          alertes, etc.). L’accès est protégé via Clerk et réservé aux utilisateurs authentifiés.
        </p>
      </div>
    </section>
  )
}
