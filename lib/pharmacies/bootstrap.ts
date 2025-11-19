import type { User } from "@clerk/nextjs/server"

import { bootstrapClerkUser, type ClerkUserPayload } from "@/lib/clerk/sync"

export async function ensurePharmacyAccess(user: User | null) {
  if (!user) {
    return
  }

  const emailAddresses = user.emailAddresses ?? []

  const normalizedEmails = emailAddresses.length
    ? emailAddresses
        .map((email) => ({
          id: email.id,
          email_address: email.emailAddress ?? "",
        }))
        .filter((entry) => entry.email_address.length > 0)
    : []

  if (normalizedEmails.length === 0) {
    const fallbackEmail = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? ""
    if (fallbackEmail.length > 0) {
      normalizedEmails.push({ id: user.id, email_address: fallbackEmail })
    }
  }

  const payload: ClerkUserPayload = {
    id: user.id,
    email_addresses: normalizedEmails,
    primary_email_address_id: user.primaryEmailAddressId ?? normalizedEmails[0]?.id ?? null,
    first_name: user.firstName,
    last_name: user.lastName,
  }

  await bootstrapClerkUser(payload)
}
