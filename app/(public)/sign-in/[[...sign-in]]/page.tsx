import { AuthGateway } from "@/components/auth-gateway"

export default function SignInPage() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
      <AuthGateway
        defaultRedirect="/app"
        mode="sign-in"
        signInProps={{ afterSignInUrl: "/app", path: "/sign-in", routing: "path", signUpUrl: "/sign-up" }}
      />
    </section>
  )
}
