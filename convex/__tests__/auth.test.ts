import type { UserIdentity } from "convex/server"

import { assertOrgAccess, getAuthOrgId } from "@/convex/auth"

type LegacyIdentity = UserIdentity & { org_id?: string }

describe("convex/auth", () => {
  it("returns org id from identity", () => {
    const identity: UserIdentity = {
      orgId: "org-1",
      issuer: "https://issuer.example",
      subject: "user-1",
      tokenIdentifier: "token-1",
    }

    expect(getAuthOrgId(identity)).toBe("org-1")
  })

  it("returns org id from legacy claim", () => {
    const identity: LegacyIdentity = {
      org_id: "org-2",
      issuer: "https://issuer.example",
      subject: "user-1",
      tokenIdentifier: "token-1",
    }

    expect(getAuthOrgId(identity)).toBe("org-2")
  })

  it("returns null when missing", () => {
    expect(getAuthOrgId(null)).toBeNull()
  })

  it("throws when org mismatch", () => {
    const identity: UserIdentity = {
      orgId: "org-1",
      issuer: "https://issuer.example",
      subject: "user-1",
      tokenIdentifier: "token-1",
    }

    expect(() => assertOrgAccess(identity, "org-2")).toThrow("Unauthorized")
  })
})
