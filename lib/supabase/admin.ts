import { createClient } from "@supabase/supabase-js"

import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env"
import type { Database } from "@/types/database"

export const supabaseAdminClient = createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
