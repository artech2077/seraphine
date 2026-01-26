"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"

export function useEnsurePharmacy() {
  const { isLoaded, orgId, userId } = useAuth()
  const { organization } = useOrganization()
  const ensurePharmacy = useMutation(api.pharmacies.ensureForOrg)
  const orgName = organization?.name ?? "Pharmacie"
  const lastEnsuredOrg = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!isLoaded || !userId || !orgId) return
    if (lastEnsuredOrg.current === orgId) return
    lastEnsuredOrg.current = orgId
    void ensurePharmacy({ clerkOrgId: orgId, name: orgName })
  }, [ensurePharmacy, isLoaded, orgId, orgName, userId])
}
