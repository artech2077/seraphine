export const APP_ENVIRONMENTS = ["development", "qa", "preview", "production"] as const

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number]
