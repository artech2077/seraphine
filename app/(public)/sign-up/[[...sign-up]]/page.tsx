import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center px-4 py-8">
      <SignUp afterSignUpUrl="/app" />
    </div>
  )
}
