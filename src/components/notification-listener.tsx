import { useEffect, useRef } from 'react'
import { useSession } from '@/components/session-provider'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type Screen = 'home' | 'chat' | 'notify' | 'gifts' | 'settings'

// App-wide realtime listener that surfaces a pop-up (toast) whenever the partner
// sends a nudge, gift, or chat message — no matter which screen is open. Toasts
// for the screen you're already looking at are suppressed to avoid noise.
export function NotificationListener({ screen, onNavigate }: { screen: Screen; onNavigate: (s: Screen) => void }) {
  const { user, pairing, partnerId } = useSession()
  const partnerName = useRef<string>('your person')
  // Keep the latest screen readable inside the (stable) subscription callbacks.
  const screenRef = useRef<Screen>(screen)
  screenRef.current = screen

  useEffect(() => {
    if (!partnerId) return
    let cancelled = false
    supabase.from('profiles').select('display_name').eq('id', partnerId).maybeSingle().then(({ data }) => {
      if (!cancelled && data?.display_name) partnerName.current = data.display_name
    })
    return () => { cancelled = true }
  }, [partnerId])

  useEffect(() => {
    if (!user || !pairing || pairing.status !== 'active') return
    const me = user.id
    const pid = pairing.id

    const channel = supabase
      .channel(`notifs-${pid}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'nudges', filter: `pairing_id=eq.${pid}`,
      }, (payload) => {
        const n = payload.new as { sender_id: string; body: string }
        if (n.sender_id === me || screenRef.current === 'notify') return
        toast(`💌 ${partnerName.current}`, {
          description: n.body,
          action: { label: 'open', onClick: () => onNavigate('notify') },
        })
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `pairing_id=eq.${pid}`,
      }, (payload) => {
        const m = payload.new as { sender_id: string; body: string; type: string }
        if (m.sender_id === me || screenRef.current === 'chat') return
        const preview = m.type === 'media' ? '📷 sent a photo' : m.type === 'gift' ? '🎁 sent a gift' : m.body
        toast(`💬 ${partnerName.current}`, {
          description: preview,
          action: { label: 'reply', onClick: () => onNavigate('chat') },
        })
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'gifts', filter: `recipient_id=eq.${me}`,
      }, (payload) => {
        const g = payload.new as { name: string; emoji: string; custom_message: string | null }
        if (screenRef.current === 'gifts') return
        toast(`${g.emoji || '🎁'} a gift from ${partnerName.current}`, {
          description: g.custom_message ? `${g.name} — "${g.custom_message}"` : g.name,
          action: { label: 'view', onClick: () => onNavigate('gifts') },
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, pairing?.id, pairing?.status, onNavigate])

  return null
}
