import { AuthGateway } from "@/components/auth-gateway"

export default function SignUpPage() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
      <AuthGateway
        defaultRedirect="/app"
        mode="sign-up"
        signUpProps={{ afterSignUpUrl: "/app", path: "/sign-up", routing: "path", signInUrl: "/sign-in" }}
      />
    </section>
  )
}
