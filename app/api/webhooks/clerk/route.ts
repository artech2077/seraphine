import { NextResponse } from "next/server"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { Webhook } from "svix"

import {
  deleteUserFromClerk,
  removeMembershipFromClerk,
  upsertMembershipFromClerk,
  upsertPharmacyFromOrganization,
  upsertUserFromClerk,
} from "@/lib/clerk/sync"
import type { ClerkUserPayload } from "@/lib/clerk/sync"

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

if (!webhookSecret) {
  throw new Error("CLERK_WEBHOOK_SECRET is not set")
}

export async function POST(request: Request) {
  const payload = await request.text()
  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 })
  }

  let event: WebhookEvent
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent
  } catch (error) {
    console.error("Clerk webhook verification failed", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    await handleEvent(event)
  } catch (error) {
    console.error("Clerk webhook handler failed", error)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleEvent(event: WebhookEvent) {
  switch (event.type) {
    case "user.created":
    case "user.updated":
      await upsertUserFromClerk(event.data as ClerkUserPayload)
      break
    case "user.deleted": {
      const id = (event.data as { id?: string }).id
      if (id) {
        await deleteUserFromClerk(id)
      }
      break
    }
    case "organization.created":
    case "organization.updated":
      await upsertPharmacyFromOrganization(event.data as WebhookEvent["data"] & { id: string })
      break
    case "organizationMembership.created":
    case "organizationMembership.updated":
      await upsertMembershipFromClerk(event)
      break
    case "organizationMembership.deleted":
      await removeMembershipFromClerk(event)
      break
    default:
      break
  }
}
