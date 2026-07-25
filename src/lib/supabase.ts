import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
