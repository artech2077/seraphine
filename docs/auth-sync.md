# Clerk ↔ Supabase Sync

This document explains how Clerk accounts, organizations, and memberships are synchronized with the Supabase database.

## Environment Variables

Add the following variables to `.env.local` (and to Vercel/Supabase environments):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Required by `ClerkProvider` |
| `CLERK_SECRET_KEY` | Used by server-side Clerk helpers |
| `CLERK_WEBHOOK_SECRET` | Verifies webhook signatures from Clerk via Svix |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous key for browser-side usage (future work) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key used by the webhook to read/write tables |

## Database Schema

`supabase/migrations/0001_link_clerk_users.sql` creates:

- `user_role` enum with `owner`, `staff`, `restricted`
- `pharmacies` (mapped 1:1 with Clerk organizations via `clerk_org_id`)
- `users` (stores `clerk_id`, role, email, and `pharmacy_id`)
- `pharmacy_memberships` (tracks membership per pharmacy and enforces uniqueness)

Run migrations locally via `supabase db reset` or `supabase db push`.

## Webhook Flow

`app/api/webhooks/clerk/route.ts` receives Clerk webhooks and verifies them with `svix`.

| Event | Behavior |
| --- | --- |
| `user.created` / `user.updated` | Upsert to `users` to keep email/name synced. |
| `user.deleted` | Removes memberships then deletes the Supabase user record. |
| `organization.created` / `organization.updated` | Upsert `pharmacies`, storing `clerk_org_id`, name, and optional address metadata. |
| `organizationMembership.created` / `organizationMembership.updated` | Ensures both `users` and `pharmacies` exist, creates/updates `pharmacy_memberships`, updates `users.role` + `pharmacy_id`. |
| `organizationMembership.deleted` | Removes the membership row and resets the user to `restricted` with no pharmacy. |

Roles are mapped as follows:

- `org:admin` → `owner`
- `org:member` → `staff`
- Any other role defaults to `restricted`

## Testing / Validation Checklist

1. **Start ngrok** (or Vercel preview) and point Clerk webhook to `/api/webhooks/clerk`.
2. **Trigger events** using `clerk events trigger` or by performing actions in the Clerk dashboard:
   - Create a user → confirm entry in `users`.
   - Create an organization → confirm entry in `pharmacies`.
   - Add the user to the organization as admin/member → confirm `pharmacy_memberships` row with mapped role and user row updated with `pharmacy_id`.
   - Remove membership → ensure membership deleted and user role reset to `restricted`.
   - Delete the user → ensure they disappear from both tables.
3. **Check Supabase logs** for errors; webhook returns HTTP 500 when a sync error occurs so Clerk can retry.
4. **Verify idempotency** by replaying the same event (Clerk dashboard supports replay) and ensuring no duplicate rows appear because of upserts and unique constraints.

## Operations Notes

- The webhook route requires the `SUPABASE_SERVICE_ROLE_KEY`; keep it server-side only.
- Keep `CLERK_WEBHOOK_SECRET` in sync with the value configured in the Clerk dashboard; rotate both when necessary.
- If Supabase schema changes, regenerate TypeScript definitions in `types/database.ts` via `supabase gen types typescript --local`.
