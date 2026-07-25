import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export type Role = 'tracker' | 'supporter' | 'both'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: Role | null
  weather: string | null
  onboarding_step: number
  onboarding_complete: boolean
  created_at: string
}

export interface Pairing {
  id: string
  code: string
  user_a: string
  user_b: string | null
  status: 'pending' | 'active' | 'unsynced'
  created_at: string
  activated_at: string | null
  ended_at: string | null
}

interface SessionContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  pairing: Pairing | null
  partnerId: string | null
  loading: boolean
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshPairing: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pairing, setPairing] = useState<Pairing | null>(null)
  const [loading, setLoading] = useState(true)

  const partnerId = pairing
    ? pairing.user_a === user?.id ? pairing.user_b : pairing.user_a
    : null

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data)
  }

  async function fetchPairing(userId: string) {
    const { data } = await supabase
      .from('pairings')
      .select('*')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setPairing(data)
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  async function refreshPairing() {
    if (user) await fetchPairing(user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        Promise.all([fetchProfile(s.user.id), fetchPairing(s.user.id)]).then(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        ;(async () => {
          await fetchProfile(s.user.id)
          await fetchPairing(s.user.id)
        })()
      } else {
        setProfile(null)
        setPairing(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, displayName?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setPairing(null)
  }

  return (
    <SessionContext.Provider value={{
      session, user, profile, pairing, partnerId, loading,
      signUp, signIn, signOut, refreshProfile, refreshPairing
    }}>
      {children}
    </SessionContext.Provider>
  )
}
