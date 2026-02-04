import { vi } from "vitest"

const BASE_ENV = {
  NEXT_PUBLIC_APP_ENV: "qa",
  NEXT_PUBLIC_APP_URL: "https://qa.example.com",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
  NEXT_PUBLIC_CONVEX_URL: "https://example.convex.cloud",
}

const ORIGINAL_ENV = process.env

const setEnv = (overrides: Partial<typeof BASE_ENV> = {}) => {
  process.env = {
    ...ORIGINAL_ENV,
    ...BASE_ENV,
    ...overrides,
  }
}

describe("getPublicEnv", () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it("returns the required public environment variables", async () => {
    setEnv()
    vi.resetModules()

    const { getPublicEnv } = await import("@/lib/env/public")

    const env = getPublicEnv()

    expect(env.NEXT_PUBLIC_APP_ENV).toBe("qa")
    expect(env.NEXT_PUBLIC_CONVEX_URL).toBe(BASE_ENV.NEXT_PUBLIC_CONVEX_URL)
  })

  it("throws when required variables are missing", async () => {
    setEnv({ NEXT_PUBLIC_CONVEX_URL: "" })
    vi.resetModules()

    const { getPublicEnv } = await import("@/lib/env/public")

    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_CONVEX_URL/)
  })
})
