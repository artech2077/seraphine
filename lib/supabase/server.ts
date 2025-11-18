import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env"
import type { Database } from "@/types/database"

export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 })
      },
    },
  })
}
