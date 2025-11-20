import Image from "next/image"
import Link from "next/link"
import { SignedIn, SignedOut } from "@clerk/nextjs"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="flex flex-1 items-center justify-center bg-background px-6 py-16 text-foreground">
        <div className="w-full max-w-4xl space-y-10 rounded-3xl border border-border bg-card/90 p-8 text-center shadow-2xl backdrop-blur-md transition-colors sm:p-12">
          <div className="space-y-4">
            <div className="flex justify-center">
              <Image src="/Seraphine_logo.svg" alt="Seraphine" width={96} height={96} className="h-16 w-auto" priority />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Gestion pharmaceutique
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">La solution moderne pour gérer votre pharmacie</h1>
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
    </div>
  )
}
