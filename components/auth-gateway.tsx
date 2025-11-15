"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ClerkLoaded, ClerkLoading, SignIn, SignUp } from "@clerk/nextjs"
import type { ComponentProps, ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type SignInProps = ComponentProps<typeof SignIn>
type SignUpProps = ComponentProps<typeof SignUp>

type BaseProps = {
  /** Absolute or relative path we redirect to once auth succeeds. */
  defaultRedirect: string
}

type SignInConfig = {
  mode: "sign-in"
  signInProps: SignInProps
}

type SignUpConfig = {
  mode: "sign-up"
  signUpProps: SignUpProps
}

type AuthGatewayProps = BaseProps & (SignInConfig | SignUpConfig)

export function AuthGateway(props: AuthGatewayProps) {
  const isSignIn = props.mode === "sign-in"
  const clerkProps = isSignIn ? props.signInProps : props.signUpProps
  const redirectTarget =
    (isSignIn ? props.signInProps.afterSignInUrl : props.signUpProps.afterSignUpUrl) ??
    props.defaultRedirect

  const [hasLoaded, setHasLoaded] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (hasLoaded) return
    const timer = setTimeout(() => setTimedOut(true), 4000)
    return () => clearTimeout(timer)
  }, [hasLoaded])

  const fallbackUrl = useMemo(() => {
    if (!timedOut || typeof window === "undefined") {
      return null
    }

    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    if (!publishableKey) {
      return null
    }

    const normalizedKey = publishableKey.replace(/^pk_(test|live)_/, "")

    try {
      const decoded = atob(normalizedKey)
      const [frontendApi] = decoded.split("$")
      if (!frontendApi) {
        return null
      }
      const target = new URL(redirectTarget, window.location.origin)
      const route = isSignIn ? "sign-in" : "sign-up"
      const url = new URL(`https://${frontendApi}/${route}`)
      url.searchParams.set("redirect_url", target.toString())
      return url.toString()
    } catch {
      return null
    }
  }, [isSignIn, redirectTarget, timedOut])

  return (
    <div className="w-full max-w-md space-y-6">
      <ClerkLoading>
        <LoadingIndicator />
      </ClerkLoading>
      <ClerkLoaded>
        <LoadedNotifier onLoaded={() => setHasLoaded(true)}>
          {isSignIn ? <SignIn {...clerkProps} /> : <SignUp {...clerkProps} />}
        </LoadedNotifier>
      </ClerkLoaded>

      {!hasLoaded && timedOut ? <FallbackNotice href={fallbackUrl} /> : null}
    </div>
  )
}

function LoadedNotifier({ children, onLoaded }: { children: ReactNode; onLoaded: () => void }) {
  useEffect(() => {
    onLoaded()
  }, [onLoaded])

  return <>{children}</>
}

function LoadingIndicator() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-border/50 bg-card/60 px-6 py-8 text-center text-sm text-muted-foreground shadow-lg backdrop-blur">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      <p>Chargement sécurisé de l’interface d’authentification…</p>
    </div>
  )
}

function FallbackNotice({ href }: { href: string | null }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-amber-800 shadow-md">
      <p className="font-medium">Le module Clerk ne s’est pas chargé correctement.</p>
      <p className="mt-1">
        Vérifiez que votre connexion n’empêche pas le chargement des scripts tiers (adblockers, VPN,
        etc.). Vous pouvez également ouvrir le portail sécurisé dans un nouvel onglet.
      </p>
      {href ? (
        <Button asChild className="mt-3" size="sm" variant="outline">
          <Link href={href} rel="noreferrer" target="_blank">
            Ouvrir la page Clerk
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
