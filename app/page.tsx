import Link from "next/link"
import { SignedIn, SignedOut } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-4xl space-y-10 rounded-3xl border border-border bg-card/90 p-8 text-center shadow-2xl backdrop-blur-md transition-colors sm:p-12">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Gestion pharmaceutique
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Seraphine</h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            La solution moderne pour gérer votre pharmacie.
          </p>
        </div>

        <div className="space-y-4 text-base text-muted-foreground sm:text-lg">
          <p>
            Pilotez vos stocks, automatisez les tâches répétitives et concentrez-vous sur le service
            aux patients grâce à une plateforme pensée pour les équipes officinales.
          </p>
        </div>

        <SignedOut>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/sign-in">Se connecter</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-up">Créer un compte</Link>
            </Button>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/app">Aller au tableau de bord</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Vous êtes connecté·e. Poursuivez vos opérations depuis l’espace sécurisé.
            </p>
          </div>
        </SignedIn>
      </div>
    </section>
  )
}
