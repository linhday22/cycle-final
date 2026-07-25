import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/components/session-provider'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SendHorizonal } from 'lucide-react'
import { toast } from 'sonner'

interface Nudge {
  id: string
  pairing_id: string
  sender_id: string
  kind: string
  preset_key: string | null
  body: string
  read_at: string | null
  created_at: string
}

const PRESETS = [
  { key: 'hug', emoji: '🤗', label: 'hug incoming', body: 'hug incoming 🤗' },
  { key: 'water', emoji: '💧', label: 'hydrate bestie', body: 'hydrate bestie 💧' },
  { key: 'rest', emoji: '🌙', label: "rest. that's the text.", body: "rest. that's the text. 🌙" },
  { key: 'food', emoji: '🍜', label: 'emergency snacks en route', body: 'emergency snacks en route 🍜' },
  { key: 'quiet', emoji: '🌧️', label: 'quiet today, not mad', body: "gonna be quiet today — not mad, just luteal-coded 🌧️" },
  { key: 'company', emoji: '🛋️', label: 'just sit with me', body: "don't fix it, just sit with me 🛋️" },
  { key: 'gentle', emoji: '🧸', label: 'handle me gently', body: 'handle me gently today 🧸' },
  { key: 'energy', emoji: '✨', label: "you're so back", body: "you're so back — let's do something ✨" },
]

// Received love notes rotate through warm gradients so each feels like its own
// little card — no cycle phase is attached to a nudge, so this is decorative.
const LOVE_GRADIENTS = [
  { from: '#FBD9E3', to: '#FCE1C9', accent: '#C0436B', ink: '#5f2438' },
  { from: '#E4DCF4', to: '#CBD8EC', accent: '#65489A', ink: '#342556' },
  { from: '#FCDDC1', to: '#F6D687', accent: '#D95F32', ink: '#65361b' },
  { from: '#DCF0DE', to: '#F4EEC6', accent: '#37814F', ink: '#234730' },
]

export function NudgeScreen() {
  const { user, pairing, partnerId } = useSession()
  const [nudges, setNudges] = useState<Nudge[]>([])
  const [customBody, setCustomBody] = useState('')
  const [sending, setSending] = useState(false)
  const [partnerName, setPartnerName] = useState<string | null>(null)
  const [showSent, setShowSent] = useState(false)
  const [now, setNow] = useState(Date.now())
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(tickRef.current)
  }, [])

  useEffect(() => {
    if (!pairing || pairing.status !== 'active') return
    loadNudges()
    loadPartnerName()
    markAsRead()

    const channel = supabase
      .channel(`nudges-${pairing.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'nudges',
        filter: `pairing_id=eq.${pairing.id}`,
      }, (payload) => {
        setNudges(prev => [payload.new as Nudge, ...prev])
        if ((payload.new as Nudge).sender_id !== user?.id) {
          markSingleRead((payload.new as Nudge).id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [pairing])

  async function loadNudges() {
    const { data } = await supabase
      .from('nudges')
      .select('*')
      .eq('pairing_id', pairing!.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNudges(data)
  }

  async function loadPartnerName() {
    if (!partnerId) return
    const { data } = await supabase.from('profiles').select('display_name').eq('id', partnerId).maybeSingle()
    setPartnerName(data?.display_name || 'your person')
  }

  async function markAsRead() {
    if (!pairing || !user) return
    await supabase
      .from('nudges')
      .update({ read_at: new Date().toISOString() })
      .eq('pairing_id', pairing.id)
      .neq('sender_id', user.id)
      .is('read_at', null)
  }

  async function markSingleRead(id: string) {
    await supabase.from('nudges').update({ read_at: new Date().toISOString() }).eq('id', id)
  }

  async function sendNudge(body: string, presetKey?: string) {
    if (!pairing) return
    setSending(true)
    await supabase.from('nudges').insert({
      pairing_id: pairing.id,
      kind: presetKey ? 'preset' : 'custom',
      preset_key: presetKey || null,
      body,
    })
    toast(`sent. you're kind of the best 💌`)
    setSending(false)
  }

  async function sendCustom(e: React.FormEvent) {
    e.preventDefault()
    if (!customBody.trim()) return
    await sendNudge(customBody.trim())
    setCustomBody('')
  }

  if (!pairing || pairing.status !== 'active') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <p className="text-muted-foreground">connect with your person to send nudges</p>
      </div>
    )
  }

  const TWO_MINUTES = 2 * 60 * 1000
  const received = nudges.filter(n => {
    if (n.sender_id === user?.id) return false
    if (!n.read_at) return true
    return now - new Date(n.read_at).getTime() < TWO_MINUTES
  })
  const sent = nudges.filter(n => n.sender_id === user?.id)

  if (showSent) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">sent by you</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowSent(false)} className="rounded-full">
            back
          </Button>
        </div>
        {sent.length === 0 ? (
          <Card className="rounded-3xl border-border/50">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">you haven't sent any nudges yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sent.map(nudge => (
              <Card key={nudge.id} className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="py-4 px-5">
                  <p className="text-sm">{nudge.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(nudge.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Send area */}
      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">send them a lil something 💌</CardTitle>
          <CardDescription>little ways to let {partnerName} know you care</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {PRESETS.map((preset, i) => (
              <button
                key={preset.key}
                onClick={() => sendNudge(preset.body, preset.key)}
                disabled={sending}
                className={`squish rounded-3xl p-4 text-center era-shadow disabled:opacity-50 ${i % 2 ? 'tilt-r-sm' : 'tilt-l-sm'}`}
                style={{ background: LOVE_GRADIENTS[i % LOVE_GRADIENTS.length].from }}
              >
                <span className="text-3xl block">{preset.emoji}</span>
                <span className="text-xs font-semibold mt-1.5 block leading-tight" style={{ color: LOVE_GRADIENTS[i % LOVE_GRADIENTS.length].ink }}>{preset.label}</span>
              </button>
            ))}
          </div>
          <form onSubmit={sendCustom} className="flex gap-2">
            <Input
              value={customBody}
              onChange={e => setCustomBody(e.target.value)}
              placeholder="or write your own (this is the good part)"
              className="flex-1 rounded-full"
            />
            <Button type="submit" disabled={sending || !customBody.trim()} className="rounded-full">
              send
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Received nudges — love note style */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">from your person 💌</h2>
        <Button variant="outline" size="sm" onClick={() => setShowSent(true)} className="rounded-full gap-1">
          <SendHorizonal className="h-3.5 w-3.5" />
          sent
        </Button>
      </div>

      {received.length === 0 ? (
        <Card className="rounded-3xl border-border/50">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              no nudges from {partnerName} right now
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-7 pt-4">
          {received.map((nudge, i) => (
            <ReceivedNudge key={nudge.id} nudge={nudge} partnerName={partnerName} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

// The received love note — the screenshot money shot: warm gradient, sender
// avatar overlapping the top edge, a tilted "from your person 💌" ribbon, and
// the message in display type.
function ReceivedNudge({ nudge, partnerName, index }: { nudge: Nudge; partnerName: string | null; index: number }) {
  const g = LOVE_GRADIENTS[index % LOVE_GRADIENTS.length]
  const initial = (partnerName || 'y').trim().charAt(0).toUpperCase()
  return (
    <div className="relative fade-rise" style={{ animationDelay: `${index * 60}ms` }}>
      {/* Avatar overlapping the top edge */}
      <div className="absolute -top-5 left-6 z-20 h-11 w-11 rounded-full bg-card era-shadow flex items-center justify-center border-2 border-card">
        <span className="text-base font-bold" style={{ color: g.accent }}>{initial}</span>
      </div>
      {/* Tilted ribbon label */}
      <div
        className="absolute -top-3 right-5 z-20 rounded-full px-3 py-1 text-[11px] font-bold tilt-r era-shadow"
        style={{ background: g.accent, color: '#fff' }}
      >
        from your person 💌
      </div>
      <div className="rounded-[26px] era-shadow px-6 pt-8 pb-6 text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)`, color: g.ink }}>
        <p className="text-2xl font-extrabold leading-snug">{nudge.body}</p>
        <p className="text-xs mt-3 opacity-70">{new Date(nudge.created_at).toLocaleString()}</p>
      </div>
    </div>
  )
}
