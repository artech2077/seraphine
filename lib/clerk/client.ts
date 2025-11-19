import { createClerkClient } from "@clerk/backend"

const secretKey = process.env.CLERK_SECRET_KEY
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!secretKey) {
  throw new Error("CLERK_SECRET_KEY is not configured")
}

export const clerkBackendClient = createClerkClient({
  secretKey,
  publishableKey,
})
