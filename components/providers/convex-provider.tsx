"use client"

import * as React from "react"
import { ConvexReactClient } from "convex/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { useAuth } from "@clerk/nextjs"

import { getPublicEnv } from "@/lib/env/public"

const { NEXT_PUBLIC_CONVEX_URL } = getPublicEnv()
const convex = new ConvexReactClient(NEXT_PUBLIC_CONVEX_URL)

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
