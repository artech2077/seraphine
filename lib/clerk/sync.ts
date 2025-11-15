import type { WebhookEvent } from "@clerk/nextjs/server"

import { supabaseAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"

type Tables = Database["public"]["Tables"]
type UserRole = Database["public"]["Enums"]["user_role"]

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
    throw new Error("Clerk user is missing an email address")
  }

  const fullName = getFullName(payload)

  const { error } = await supabaseAdminClient.from("users").upsert<Pick<Tables["users"]["Insert"], "clerk_id" | "email" | "full_name">>(
    {
      clerk_id: payload.id,
      email: primaryEmail,
      full_name: fullName,
    },
    { onConflict: "clerk_id" }
  )

  if (error) {
    throw error
  }
}

export async function upsertPharmacyFromOrganization(organization: ClerkOrganizationPayload): Promise<string> {
  const name = typeof organization.name === "string" && organization.name.length > 0 ? organization.name : organization.slug
  if (!name) {
    throw new Error("Organization payload is missing a name or slug")
  }

  const address = getOrganizationAddress(organization)

  const { data, error } = await supabaseAdminClient
    .from("pharmacies")
    .upsert<Pick<Tables["pharmacies"]["Insert"], "clerk_org_id" | "name" | "address">>(
      {
        clerk_org_id: organization.id,
        name,
        address,
      },
      { onConflict: "clerk_org_id" }
    )
    .select("id")
    .single()

  if (error) {
    throw error
  }

  return data.id
}

export async function upsertMembershipFromClerk(event: WebhookEvent) {
  const membership = event.data as ClerkMembershipPayload
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

  const { error: membershipError } = await supabaseAdminClient
    .from("pharmacy_memberships")
    .upsert<Pick<Tables["pharmacy_memberships"]["Insert"], "pharmacy_id" | "user_id" | "role">>(
      {
        pharmacy_id: pharmacyId,
        user_id: userRecord.id,
        role,
      },
      { onConflict: "pharmacy_id,user_id" }
    )

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
