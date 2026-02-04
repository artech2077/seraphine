import { z } from "zod"

export function formatEnvErrors(error: z.ZodError, scope: string) {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join(".") || "(root)"
    return `${path}: ${issue.message}`
  })

  return `Missing or invalid ${scope} environment variables:\n- ${issues.join("\n- ")}\n\nCheck your Vercel environment variables or .env.local.`
}
