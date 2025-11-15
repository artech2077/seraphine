import type { NextConfig } from "next"

const clerkFrontendApi = getClerkFrontendApi(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

const nextConfig: NextConfig = {
  async rewrites() {
    if (!clerkFrontendApi) {
      return []
    }

    return [
      {
        source: "/clerk/:path*",
        destination: `https://${clerkFrontendApi}/:path*`,
      },
    ]
  },
}

export default nextConfig

function getClerkFrontendApi(key?: string | null): string | null {
  if (!key) {
    return null
  }

  const match = key.match(/^pk_(?:test|live)_(.*)$/)
  const encoded = match?.[1]
  if (!encoded) {
    return null
  }

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8")
    const [frontendApi] = decoded.split("$")
    return frontendApi || null
  } catch {
    return null
  }
}
