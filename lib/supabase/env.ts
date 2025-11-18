function invariant(value: string | undefined, message: string): asserts value is string {
  if (!value) {
    throw new Error(message)
  }
}

export function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  invariant(url, "NEXT_PUBLIC_SUPABASE_URL is not set")
  return url
}

export function getSupabaseAnonKey() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  invariant(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set")
  return anonKey
}

export function getSupabaseServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  invariant(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY is not set")
  return serviceRoleKey
}
