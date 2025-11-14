import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" afterSignInUrl="/app" />
    </section>
  )
}
