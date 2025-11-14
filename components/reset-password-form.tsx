"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSignIn } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Step = "request" | "verify"

export function ResetPasswordForm() {
  const router = useRouter()
  const { isLoaded, signIn } = useSignIn()

  const [step, setStep] = useState<Step>("request")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => {
    return step === "request" ? "Réinitialiser votre mot de passe" : "Confirmer le code"
  }, [step])

  const subtitle = useMemo(() => {
    return step === "request"
      ? "Saisissez l’adresse e-mail de votre compte et nous vous enverrons un code de réinitialisation."
      : "Entrez le code reçu et définissez un nouveau mot de passe sécurisé."
  }, [step])

  const normalizedError = error ?? undefined

  const handleRequestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isLoaded || !signIn) return

    setIsSubmitting(true)
    setError(null)

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      })
      setStep("verify")
    } catch (err) {
      setError(resolveClerkError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isLoaded || !signIn) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      })

      if (result.status === "complete") {
        router.push("/sign-in?reset=success")
      } else {
        setError("Impossible de valider le code. Veuillez réessayer.")
      }
    } catch (err) {
      setError(resolveClerkError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-sm">
      <div className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Sécurité</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {step === "request" ? (
        <form className="mt-8 space-y-6" onSubmit={handleRequestCode}>
          <label className="space-y-2 text-left text-sm font-medium">
            <span>Adresse e-mail</span>
            <Input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nom@pharmacie.ma"
              required
              type="email"
              value={email}
            />
          </label>

          {normalizedError ? (
            <p className="text-sm font-medium text-destructive">{normalizedError}</p>
          ) : null}

          <Button className="w-full" disabled={isSubmitting || !email} type="submit">
            {isSubmitting ? "Envoi..." : "Envoyer le code"}
          </Button>
        </form>
      ) : (
        <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
          <label className="space-y-2 text-left text-sm font-medium">
            <span>Code reçu</span>
            <Input
              inputMode="numeric"
              maxLength={8}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
              required
              value={code}
            />
          </label>

          <label className="space-y-2 text-left text-sm font-medium">
            <span>Nouveau mot de passe</span>
            <Input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              required
              type="password"
              value={password}
            />
          </label>

          {normalizedError ? (
            <p className="text-sm font-medium text-destructive">{normalizedError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Le mot de passe doit contenir au moins 8 caractères.
            </p>
          )}

          <Button
            className="w-full"
            disabled={isSubmitting || !code || password.length < 8}
            type="submit"
          >
            {isSubmitting ? "Validation..." : "Mettre à jour le mot de passe"}
          </Button>
        </form>
      )}

      {step === "verify" ? (
        <button
          className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setStep("request")}
          type="button"
        >
          Renvoyer un code
        </button>
      ) : null}
    </div>
  )
}

function resolveClerkError(err: unknown) {
  if (typeof err === "string") {
    return err
  }

  if (isClerkErrorResponse(err)) {
    return err.errors[0]?.message ?? "Une erreur est survenue."
  }

  return "Une erreur est survenue."
}

type ClerkErrorResponse = {
  errors: Array<{
    message?: string
  }>
}

function isClerkErrorResponse(error: unknown): error is ClerkErrorResponse {
  if (!error || typeof error !== "object") {
    return false
  }

  return "errors" in error && Array.isArray((error as { errors?: unknown }).errors)
}
