import "server-only"

import { z } from "zod"

import { getPublicEnv } from "@/lib/env/public"
import { formatEnvErrors } from "@/lib/env/utils"

const serverEnvSchema = z.object({
  CLERK_JWT_ISSUER_DOMAIN: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CONVEX_DEPLOYMENT: z.string().min(1),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

export function getServerEnv() {
  const publicEnv = getPublicEnv()
  const result = serverEnvSchema.safeParse(process.env)

  if (!result.success) {
    throw new Error(formatEnvErrors(result.error, "server"))
  }

  return {
    ...publicEnv,
    ...result.data,
  }
}
