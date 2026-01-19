import type { UserIdentity } from "convex/server"

export function getAuthOrgId(identity: UserIdentity | null): string | null {
  if (!identity) return null
  if (typeof identity.orgId === "string") return identity.orgId
  const orgId = (identity as Record<string, unknown>)["org_id"]
  return typeof orgId === "string" ? orgId : null
}

export function assertOrgAccess(
  identity: UserIdentity | null,
  clerkOrgId: string
): asserts identity is UserIdentity {
  const orgId = getAuthOrgId(identity)
  if (!orgId || orgId !== clerkOrgId) {
    throw new Error("Unauthorized")
  }
}
