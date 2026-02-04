import type { useAuth, useOrganization } from "@clerk/nextjs"

type UseAuthReturn = ReturnType<typeof useAuth>
type UseOrganizationReturn = ReturnType<typeof useOrganization>
type OrganizationResource = NonNullable<UseOrganizationReturn["organization"]>
type SignedInOrgAuth = Extract<UseAuthReturn, { isLoaded: true; isSignedIn: true; orgId: string }>

export function mockClerkAuth(overrides: Partial<SignedInOrgAuth> = {}): SignedInOrgAuth {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: "user-1",
    sessionId: "session-1",
    sessionClaims: {} as SignedInOrgAuth["sessionClaims"],
    actor: null,
    orgId: "org-1",
    orgRole: "admin" as SignedInOrgAuth["orgRole"],
    orgSlug: "pharmacie",
    has: vi.fn(() => true) as SignedInOrgAuth["has"],
    signOut: vi.fn() as SignedInOrgAuth["signOut"],
    getToken: vi.fn() as SignedInOrgAuth["getToken"],
    ...overrides,
  }
}

type MockOrganizationReturn = Extract<
  UseOrganizationReturn,
  { isLoaded: boolean; organization: OrganizationResource | null }
>

export function mockOrganization(
  overrides: Partial<OrganizationResource> = {}
): MockOrganizationReturn {
  return {
    isLoaded: true,
    organization: {
      id: "org-1",
      name: "Pharmacie",
      slug: "pharmacie",
      imageUrl: "",
      hasImage: false,
      membersCount: 0,
      adminDeleteEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      publicMetadata: {},
      privateMetadata: {},
      unsafeMetadata: {},
      ...overrides,
    } as OrganizationResource,
    membership: null,
    domains: null,
    membershipRequests: null,
    memberships: null,
    invitations: null,
  }
}
