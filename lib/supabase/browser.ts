import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env"
import type { Database } from "@/types/database"

let browserClient: SupabaseClient<Database> | null = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey())
  }

  return browserClient
}
