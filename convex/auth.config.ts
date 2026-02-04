import { AuthConfig } from "convex/server"

const clerkIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN

if (!clerkIssuerDomain) {
  throw new Error("CLERK_JWT_ISSUER_DOMAIN is required for Convex auth.")
}

export default {
  providers: [
    {
      domain: clerkIssuerDomain,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig
