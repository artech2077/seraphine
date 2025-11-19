import type { WebhookEvent } from "@clerk/nextjs/server"

import { supabaseAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"
import { clerkBackendClient } from "./client"

type Tables = Database["public"]["Tables"]
type UserRole = Database["public"]["Enums"]["user_role"]
type UnknownRecord = Record<string, unknown>

type ClerkEmailAddress = {
  id: string
  email_address: string
}

export type ClerkUserPayload = {
  id: string
  email_addresses: ClerkEmailAddress[]
  primary_email_address_id?: string | null
  first_name?: string | null
  last_name?: string | null
}

export type ClerkOrganizationPayload = {
  id: string
  name?: string | null
  slug?: string | null
  public_metadata?: {
    address?: string | null
    [key: string]: unknown
  } | null
}

export type ClerkMembershipPayload = {
  role?: string | null
  organization: ClerkOrganizationPayload
  public_user_data: {
    user_id: string
    email_address?: string | null
    first_name?: string | null
    last_name?: string | null
  }
}

const roleMap: Record<string, UserRole> = {
  "org:admin": "owner",
  "org:member": "staff",
}

const defaultRole: UserRole = "restricted"

export function mapClerkRole(role?: string | null): UserRole {
  if (!role) {
    return defaultRole
  }
  return roleMap[role] ?? defaultRole
}

export async function upsertUserFromClerk(payload: ClerkUserPayload) {
  const primaryEmail = getPrimaryEmail(payload)

  if (!primaryEmail) {
    console.warn("Clerk user is missing an email address, skipping upsert", payload.id)
    return
  }

  const fullName = getFullName(payload)

  const upsertPayload = {
    clerk_id: payload.id,
    email: primaryEmail,
    full_name: fullName,
  } satisfies Tables["users"]["Insert"]

  const { error } = await supabaseAdminClient.from("users").upsert<Tables["users"]["Insert"]>(upsertPayload, {
    onConflict: "clerk_id",
  })

  if (error) {
    throw error
  }
}

export async function bootstrapClerkUser(payload: ClerkUserPayload) {
  await upsertUserFromClerk(payload)
  await ensurePersonalPharmacyForUser(payload)
  await syncMembershipsForUser(payload.id)
}

export async function ensurePersonalPharmacyForUser(payload: ClerkUserPayload) {
  if (!payload.id) {
    return
  }

  const memberships = await clerkBackendClient.users.getOrganizationMembershipList({ userId: payload.id, limit: 1 })

  if ((memberships?.data?.length ?? 0) > 0) {
    return
  }

  const name = buildDefaultOrganizationName(payload)
  const slug = buildDefaultOrganizationSlug(payload)

  await clerkBackendClient.organizations.createOrganization({
    name,
    slug,
    createdBy: payload.id,
    publicMetadata: {
      bootstrap: true,
    },
  })
}

export async function upsertPharmacyFromOrganization(organization: ClerkOrganizationPayload): Promise<string> {
  const name = typeof organization.name === "string" && organization.name.length > 0 ? organization.name : organization.slug
  if (!name) {
    throw new Error("Organization payload is missing a name or slug")
  }

  const address = getOrganizationAddress(organization)

  const upsertPayload = {
    clerk_org_id: organization.id,
    name,
    address,
  } satisfies Tables["pharmacies"]["Insert"]

  const { data, error } = await supabaseAdminClient
    .from("pharmacies")
    .upsert<Tables["pharmacies"]["Insert"]>(upsertPayload, { onConflict: "clerk_org_id" })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  return data.id
}

export async function upsertMembershipFromClerk(event: WebhookEvent) {
  const membership = event.data as ClerkMembershipPayload
  await syncMembershipFromPayload(membership)
}

export async function syncMembershipsForUser(clerkUserId: string) {
  if (!clerkUserId) return

  const membershipList = await clerkBackendClient.users.getOrganizationMembershipList({ userId: clerkUserId })

  for (const membership of membershipList?.data ?? []) {
    const rawMembership = membership as UnknownRecord
    const organizationRecord = rawMembership.organization as UnknownRecord | undefined
    const publicUserData =
      (rawMembership.public_user_data as UnknownRecord | undefined) ??
      (rawMembership.publicUserData as UnknownRecord | undefined)
    const clerkUserId =
      (rawMembership.user_id as string | undefined) ??
      (rawMembership.userId as string | undefined) ??
      (publicUserData?.user_id as string | undefined) ??
      (publicUserData?.userId as string | undefined)

    const organizationId = typeof organizationRecord?.id === "string" ? organizationRecord.id : undefined
    if (!organizationId || !clerkUserId) {
      continue
    }

    const organizationName = typeof organizationRecord?.name === "string" ? organizationRecord.name : null
    const organizationSlug = typeof organizationRecord?.slug === "string" ? organizationRecord.slug : null
    const organizationMetadata =
      (organizationRecord?.public_metadata as ClerkOrganizationPayload["public_metadata"]) ??
      (organizationRecord?.publicMetadata as ClerkOrganizationPayload["public_metadata"]) ??
      null

    await syncMembershipFromPayload({
      role: membership.role,
      organization: {
        id: organizationId,
        name: organizationName,
        slug: organizationSlug,
        public_metadata: organizationMetadata,
      },
      public_user_data: {
        user_id: clerkUserId,
        email_address: (publicUserData?.email_address as string | null) ?? (publicUserData?.emailAddress as string | null) ?? null,
        first_name: (publicUserData?.first_name as string | null) ?? (publicUserData?.firstName as string | null) ?? null,
        last_name: (publicUserData?.last_name as string | null) ?? (publicUserData?.lastName as string | null) ?? null,
      },
    })
  }
}

export async function removeMembershipFromClerk(event: WebhookEvent) {
  const membership = event.data as ClerkMembershipPayload
  const orgId = membership.organization?.id
  const userId = membership.public_user_data?.user_id

  if (!orgId || !userId) {
    throw new Error("Membership deletion payload missing organization or user ids")
  }

  const { data: pharmacy, error: pharmacyError } = await supabaseAdminClient
    .from("pharmacies")
    .select("id")
    .eq("clerk_org_id", orgId)
    .maybeSingle()

  if (pharmacyError) {
    throw pharmacyError
  }

  const { data: userRecord, error: userError } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle()

  if (userError) {
    throw userError
  }

  if (pharmacy && userRecord) {
    const { error } = await supabaseAdminClient
      .from("pharmacy_memberships")
      .delete()
      .eq("pharmacy_id", pharmacy.id)
      .eq("user_id", userRecord.id)

    if (error) {
      throw error
    }
  }

  if (userRecord) {
    const { error } = await supabaseAdminClient
      .from("users")
      .update({ pharmacy_id: null, role: defaultRole })
      .eq("id", userRecord.id)

    if (error) {
      throw error
    }
  }
}

export async function deleteUserFromClerk(clerkUserId: string) {
  const { data: userRecord, error } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!userRecord) {
    return
  }

  const { error: membershipError } = await supabaseAdminClient
    .from("pharmacy_memberships")
    .delete()
    .eq("user_id", userRecord.id)

  if (membershipError) {
    throw membershipError
  }

  const { error: userDeleteError } = await supabaseAdminClient.from("users").delete().eq("id", userRecord.id)

  if (userDeleteError) {
    throw userDeleteError
  }
}

function getPrimaryEmail(data: ClerkUserPayload): string | null {
  if (!data.email_addresses || data.email_addresses.length === 0) {
    return null
  }

  const primaryId = data.primary_email_address_id
  const primary = data.email_addresses.find((address) => address.id === primaryId)
  const resolved = (primary ?? data.email_addresses[0])?.email_address ?? null
  return resolved && resolved.length > 0 ? resolved : null
}

function getFullName(data: ClerkUserPayload): string | null {
  const first = data.first_name
  const last = data.last_name
  const name = [first, last].filter(Boolean).join(" ").trim()
  return name.length > 0 ? name : null
}

function getOrganizationAddress(data: ClerkOrganizationPayload): string | null {
  const addressFromMetadata = data.public_metadata?.address
  return typeof addressFromMetadata === "string" ? addressFromMetadata : null
}

async function syncMembershipFromPayload(membership: ClerkMembershipPayload) {
  const organization = membership.organization
  const user = membership.public_user_data

  if (!organization?.id || !user?.user_id) {
    throw new Error("Membership payload missing organization or user identifiers")
  }

  await upsertUserFromClerk({
    id: user.user_id,
    email_addresses: [
      {
        id: user.user_id,
        email_address: user.email_address ?? "",
      },
    ],
    first_name: user.first_name,
    last_name: user.last_name,
    primary_email_address_id: user.user_id,
  })

  const pharmacyId = await upsertPharmacyFromOrganization(organization)

  const { data: userRecord, error: userQueryError } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", user.user_id)
    .maybeSingle()

  if (userQueryError) {
    throw userQueryError
  }

  if (!userRecord) {
    throw new Error("User row was not found after upsert")
  }

  const role = mapClerkRole(membership.role)

  const membershipUpsertPayload = {
    pharmacy_id: pharmacyId,
    user_id: userRecord.id,
    role,
  } satisfies Tables["pharmacy_memberships"]["Insert"]

  const { error: membershipError } = await supabaseAdminClient
    .from("pharmacy_memberships")
    .upsert<Tables["pharmacy_memberships"]["Insert"]>(membershipUpsertPayload, { onConflict: "pharmacy_id,user_id" })

  if (membershipError) {
    throw membershipError
  }

  const { error: userUpdateError } = await supabaseAdminClient
    .from("users")
    .update({ pharmacy_id: pharmacyId, role })
    .eq("id", userRecord.id)

  if (userUpdateError) {
    throw userUpdateError
  }
}

function buildDefaultOrganizationName(payload: ClerkUserPayload) {
  const fullName = getFullName(payload)
  if (fullName) {
    return `Pharmacie ${fullName}`
  }
  const email = getPrimaryEmail(payload)
  if (email) {
    return `Pharmacie ${email.split("@")[0]}`
  }
  return "Nouvelle Pharmacie"
}

function buildDefaultOrganizationSlug(payload: ClerkUserPayload) {
  const fromName = getFullName(payload)
  const fromEmail = getPrimaryEmail(payload)?.split("@")[0]
  const base = (fromName || fromEmail || payload.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)

  const suffix = payload.id.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-6)

  return [base || "pharmacie", suffix].filter(Boolean).join("-")
}
