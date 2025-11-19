import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env"
import type { Database } from "@/types/database"

export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      get(name: string) {
        if (typeof (cookieStore as unknown as { get?: (key: string) => { value?: string } | undefined }).get !== "function") {
          return undefined
        }
        const cookie = (cookieStore as { get: (key: string) => { value?: string } | undefined }).get(name)
        return cookie?.value
      },
      set(name, value, options) {
        const setter = (cookieStore as unknown as { set?: (cookie: { name: string; value: string } & Record<string, unknown>) => void }).set
        if (typeof setter === "function") {
          setter({ name, value, ...options })
        }
      },
      remove(name, options) {
        const setter = (cookieStore as unknown as { set?: (cookie: { name: string; value: string } & Record<string, unknown>) => void }).set
        if (typeof setter === "function") {
          setter({ name, value: "", ...options, maxAge: 0 })
        }
      },
    },
  })
}
