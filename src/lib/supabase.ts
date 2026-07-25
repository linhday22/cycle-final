import { createClient } from '@supabase/supabase-js'

// Normalize the Supabase URL to just its origin (scheme + host). This defends
// against common paste mistakes — a trailing slash, or an accidental path like
// ".../rest/v1" — either of which makes the client build a malformed endpoint
// (e.g. ".../rest/v1/auth/v1/token") that Supabase rejects with
// "Invalid path specified in request URL".
function normalizeSupabaseUrl(raw?: string): string | undefined {
  if (!raw) return raw
  const trimmed = raw.trim()
  try {
    return new URL(trimmed).origin
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// True only when both env vars are present. When false, the app shows a
// configuration screen instead of crashing to a blank page.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Fall back to harmless placeholder values so createClient() never throws at
// module load. The UI guards on `isSupabaseConfigured` before making any call,
// so these placeholders are never actually used to hit the network.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
