import { SignInButton, SignUpButton } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

export default function PublicHomePage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center px-4 py-10">
      <div className="bg-card text-card-foreground border-border w-full max-w-lg rounded-lg border p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Welcome to Seraphine</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to continue, or create an account to get started.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <SignInButton mode="redirect" forceRedirectUrl="/app">
            <Button>Sign in</Button>
          </SignInButton>
          <SignUpButton mode="redirect" forceRedirectUrl="/app">
            <Button variant="outline">Sign up</Button>
          </SignUpButton>
        </div>
      </div>
    </div>
  )
}
