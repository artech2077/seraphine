import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center px-4 py-8">
      <SignIn afterSignInUrl="/app" />
    </div>
  )
}
