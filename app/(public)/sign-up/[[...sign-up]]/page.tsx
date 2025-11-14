import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" afterSignUpUrl="/app" />
    </section>
  )
}
