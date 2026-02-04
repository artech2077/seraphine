import { z } from "zod"

import { APP_ENVIRONMENTS, type AppEnvironment } from "@/lib/env/constants"
import { formatEnvErrors } from "@/lib/env/utils"

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(APP_ENVIRONMENTS),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>
export type { AppEnvironment }

export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse(process.env)

  if (!result.success) {
    throw new Error(formatEnvErrors(result.error, "public"))
  }

  return result.data
}
