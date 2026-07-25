import { createClient } from '@supabase/supabase-js'

// Trim stray whitespace and any trailing slashes. A trailing slash on the URL
// makes the client build "https://xxx.supabase.co//auth/v1/..." (double slash),
// which Supabase's gateway rejects with "Invalid path specified in request URL".
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '')
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
