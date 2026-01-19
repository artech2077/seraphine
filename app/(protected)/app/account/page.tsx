import { UserProfile } from "@clerk/nextjs"

export default function AccountPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen items-start justify-center px-4 py-10">
      <UserProfile routing="hash" />
    </div>
  )
}
