import { useEffect, useState } from 'react'
import { useSession } from '@/components/session-provider'
import { supabase } from '@/lib/supabase'
import { getCycleInfo } from '@/lib/cycle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'

interface GiftOption {
  name: string
  emoji: string
  cost: number
  reason: string
}

interface SentGift {
  id: string
  name: string
  emoji: string
  cost: number
  custom_message: string | null
  status: string
  created_at: string
}

interface BoardGift {
  id: string
  name: string
  emoji: string
  custom_message: string | null
  sender_name: string
  created_at: string
}

const CREDIT_PACKS = [
  { credits: 100, price: '$0.99', label: 'starter' },
  { credits: 300, price: '$1.99', label: 'sweet spot' },
  { credits: 700, price: '$3.99', label: 'big spender' },
  { credits: 1500, price: '$6.99', label: 'love language' },
]

const PHASE_GIFTS: Record<string, GiftOption[]> = {
  menstrual: [
    { name: 'heating pad', emoji: '🔥', cost: 80, reason: 'cramps are no joke — warmth helps' },
    { name: 'dark chocolate', emoji: '🍫', cost: 40, reason: 'magnesium + dopamine = survival kit' },
    { name: 'sanitary pads', emoji: '🩹', cost: 35, reason: 'the practical one — always needed' },
    { name: 'cozy blanket time', emoji: '🧸', cost: 60, reason: 'maximum comfort vibes' },
    { name: 'herbal tea', emoji: '🍵', cost: 25, reason: 'warm, gentle, caffeine-free' },
    { name: 'comfort food delivery', emoji: '🍜', cost: 120, reason: 'sometimes soup fixes everything' },
  ],
  follicular: [
    { name: 'energy smoothie', emoji: '🥤', cost: 45, reason: 'energy is returning — fuel the comeback' },
    { name: 'fresh flowers', emoji: '💐', cost: 75, reason: 'match the fresh energy' },
    { name: 'nice coffee', emoji: '☕', cost: 35, reason: 'a little treat for the rising vibe' },
    { name: 'workout snack pack', emoji: '🥜', cost: 40, reason: 'great phase for movement — fuel it' },
    { name: 'a fun date plan', emoji: '✨', cost: 50, reason: "they're feeling social — seize it" },
  ],
  ovulatory: [
    { name: 'flowers bouquet', emoji: '🌸', cost: 90, reason: "glow era deserves glow things" },
    { name: 'fancy chocolate box', emoji: '🎁', cost: 65, reason: "match their peak energy" },
    { name: 'a date night', emoji: '🥂', cost: 150, reason: "high energy + high mood = go do something" },
    { name: 'skincare treat', emoji: '✨', cost: 70, reason: "their skin is already glowing — lean in" },
  ],
  luteal: [
    { name: 'comfort chocolate', emoji: '🍫', cost: 40, reason: "cravings are real — satisfy them" },
    { name: 'sanitary pads (prepping)', emoji: '🩹', cost: 35, reason: "period's coming — stock up" },
    { name: 'bath bomb', emoji: '🛁', cost: 30, reason: "tension relief in fizzy form" },
    { name: 'cozy socks', emoji: '🧦', cost: 35, reason: "small comfort, big impact" },
    { name: 'their favorite snack', emoji: '🍪', cost: 45, reason: "they know what they want rn" },
    { name: 'gentle massage voucher', emoji: '💆', cost: 100, reason: "touch can help when words don't" },
  ],
}

const GENERIC_GIFTS: GiftOption[] = [
  { name: 'chocolates', emoji: '🍫', cost: 40, reason: 'always a good idea' },
  { name: 'flowers', emoji: '💐', cost: 75, reason: 'classic for a reason' },
  { name: 'comfort food', emoji: '🍜', cost: 120, reason: 'food is love' },
  { name: 'a sweet note', emoji: '💌', cost: 10, reason: 'sometimes words are enough' },
]

type GiftView = 'send' | 'custom' | 'board' | 'history' | 'buy'

export function GiftScreen() {
  const { user, pairing, partnerId } = useSession()
  const [balance, setBalance] = useState<number | null>(null)
  const [partnerPhase, setPartnerPhase] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState('your person')
  const [sentGifts, setSentGifts] = useState<SentGift[]>([])
  const [boardGifts, setBoardGifts] = useState<BoardGift[]>([])
  const [sending, setSending] = useState<string | null>(null)
  const [view, setView] = useState<GiftView>('send')

  // Custom gift state
  const [customMessage, setCustomMessage] = useState('')
  const [customEmoji, setCustomEmoji] = useState('🎁')
  const [customGiftName, setCustomGiftName] = useState('')

  const isPaired = pairing?.status === 'active'

  useEffect(() => {
    if (user) loadWallet()
    if (user) loadMyBoard()
    if (isPaired && partnerId) {
      loadPartnerPhase()
      loadPartnerName()
      loadSentGifts()
    }
  }, [user, isPaired, partnerId])

  async function loadWallet() {
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user!.id)
      .maybeSingle()
    if (data) {
      setBalance(data.balance)
    } else {
      await supabase.from('wallets').insert({ balance: 500 })
      setBalance(500)
    }
  }

  async function loadPartnerPhase() {
    if (!partnerId) return
    // Respect the partner's privacy dial — only surface their phase if they share it.
    const { data: sharing } = await supabase
      .from('sharing_settings')
      .select('share_phase')
      .eq('user_id', partnerId)
      .maybeSingle()
    if (sharing && sharing.share_phase === false) {
      setPartnerPhase(null)
      return
    }
    const { data: cycle } = await supabase
      .from('cycles')
      .select('*')
      .eq('user_id', partnerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (cycle) {
      const info = getCycleInfo(cycle.last_period_start, cycle.avg_cycle_length, cycle.avg_period_length)
      setPartnerPhase(info.phase)
    }
  }

  async function loadPartnerName() {
    if (!partnerId) return
    const { data } = await supabase.from('profiles').select('display_name').eq('id', partnerId).maybeSingle()
    setPartnerName(data?.display_name || 'your person')
  }

  async function loadSentGifts() {
    const { data } = await supabase
      .from('gifts')
      .select('id, name, emoji, cost, custom_message, status, created_at')
      .eq('sender_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setSentGifts(data)
  }

  async function loadMyBoard() {
    const { data: gifts } = await supabase
      .from('gifts')
      .select('id, name, emoji, custom_message, sender_id, created_at')
      .eq('recipient_id', user!.id)
      .eq('is_board_visible', true)
      .order('created_at', { ascending: false })
      .limit(30)
    if (!gifts || gifts.length === 0) { setBoardGifts([]); return }

    const senderIds = [...new Set(gifts.map(g => g.sender_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', senderIds)
    const nameMap = new Map(profiles?.map(p => [p.id, p.display_name || 'someone']) || [])

    setBoardGifts(gifts.map(g => ({
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      custom_message: g.custom_message,
      sender_name: nameMap.get(g.sender_id) || 'your person',
      created_at: g.created_at,
    })))
  }

  async function sendGift(gift: GiftOption, customMsg?: string) {
    if (!partnerId || !pairing || balance === null) return
    if (balance < gift.cost) {
      toast("not enough credits — but it's the thought that counts 💸")
      return
    }

    setSending(gift.name)
    const newBalance = balance - gift.cost

    await supabase.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', user!.id)

    await supabase.from('gifts').insert({
      recipient_id: partnerId,
      pairing_id: pairing.id,
      name: gift.name,
      emoji: gift.emoji,
      cost: gift.cost,
      phase_context: partnerPhase,
      custom_message: customMsg || null,
    })

    setBalance(newBalance)
    toast(`${gift.emoji} ${gift.name} sent to ${partnerName} — you're the best 💌`)
    await loadSentGifts()
    setSending(null)
  }

  async function sendCustomGift() {
    if (!customGiftName.trim()) {
      toast('give your gift a name!')
      return
    }
    await sendGift({ name: customGiftName.trim(), emoji: customEmoji, cost: 100, reason: '' }, customMessage.trim() || undefined)
    setCustomMessage('')
    setCustomGiftName('')
    setCustomEmoji('🎁')
    setView('send')
  }

  const [buying, setBuying] = useState<number | null>(null)

  async function buyCredits(pack: typeof CREDIT_PACKS[number]) {
    if (!user || balance === null) return
    // Demo mode: no real charge. When Stripe is wired up, this is where you'd
    // redirect to a Checkout session / confirm a PaymentIntent, then only credit
    // the wallet from a verified server-side webhook. For now we top up directly
    // so the rest of the gifting flow is fully testable.
    const ok = window.confirm(`Add ${pack.credits} credits to your wallet?\n\nDemo mode — no real payment is taken (${pack.price} shown for preview only).`)
    if (!ok) return
    setBuying(pack.credits)
    const newBalance = balance + pack.credits
    const { error } = await supabase
      .from('wallets')
      .upsert({ user_id: user.id, balance: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setBuying(null)
    if (error) {
      toast("couldn't add credits — try again?")
      return
    }
    setBalance(newBalance)
    toast(`+${pack.credits} credits added 🎉 go spoil ${partnerName}`)
    setView('send')
  }

  if (!isPaired && view !== 'board') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">connect with your person to send gifts 🎁</p>
          <Button variant="outline" className="rounded-full" onClick={() => setView('board')}>
            view my gift board
          </Button>
        </div>
      </div>
    )
  }

  const suggestions = partnerPhase ? PHASE_GIFTS[partnerPhase] || GENERIC_GIFTS : GENERIC_GIFTS
  const phaseLabel = partnerPhase ? `${partnerName} is in their ${partnerPhase} phase` : null

  // Tab navigation
  const tabs = [
    { id: 'send' as GiftView, label: 'send' },
    { id: 'custom' as GiftView, label: 'custom' },
    { id: 'board' as GiftView, label: 'my board' },
    { id: 'buy' as GiftView, label: 'get credits' },
  ]

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Balance */}
      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">your balance</p>
            <p className="text-2xl font-bold">{balance ?? '...'} <span className="text-sm font-normal text-muted-foreground">credits</span></p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setView(view === 'history' ? 'send' : 'history')} className="rounded-full text-xs">
            {view === 'history' ? 'back' : 'history'}
          </Button>
        </CardContent>
      </Card>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-full bg-muted/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex-1 py-2 text-xs font-medium rounded-full transition-colors ${view === tab.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Send view */}
      {view === 'send' && (
        <>
          <Card className="rounded-3xl border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">send {partnerName} a gift 🎁</CardTitle>
              {phaseLabel && <CardDescription>{phaseLabel} — here's what might help rn</CardDescription>}
              {!phaseLabel && <CardDescription>pick something nice for them</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestions.map(gift => (
                <button
                  key={gift.name}
                  onClick={() => sendGift(gift)}
                  disabled={sending !== null || (balance !== null && balance < gift.cost)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl shrink-0">{gift.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{gift.name}</p>
                    <p className="text-xs text-muted-foreground">{gift.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold">{gift.cost}</p>
                    <p className="text-[10px] text-muted-foreground">credits</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {partnerPhase && (
            <Card className="rounded-3xl border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">or just because</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {GENERIC_GIFTS.map(gift => (
                  <button
                    key={gift.name}
                    onClick={() => sendGift(gift)}
                    disabled={sending !== null || (balance !== null && balance < gift.cost)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-xl">{gift.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{gift.name}</p>
                      <p className="text-xs text-muted-foreground">{gift.reason}</p>
                    </div>
                    <span className="text-xs font-semibold">{gift.cost}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Custom gift view */}
      {view === 'custom' && (
        <Card className="rounded-3xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> custom gift
            </CardTitle>
            <CardDescription>write anything — your creativity is the gift (100 credits)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">pick or type your own emoji</p>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="text"
                    value={customEmoji}
                    onChange={e => {
                      const val = e.target.value
                      const emojis = [...val].filter(ch => /\p{Emoji}/u.test(ch) && !/\d/u.test(ch))
                      if (emojis.length > 0) setCustomEmoji(emojis[emojis.length - 1])
                    }}
                    className="h-14 w-14 text-3xl text-center rounded-2xl border-2 border-primary/30 bg-primary/5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    aria-label="emoji for your gift"
                  />
                  <span className="absolute -bottom-4 left-0 right-0 text-[9px] text-center text-muted-foreground">tap to type</span>
                </div>
                <div className="flex-1 flex gap-1.5 flex-wrap">
                  {['🎁', '💝', '🌹', '🧸', '🎨', '✨', '🌙', '🦋', '🍰', '💎', '🔥', '🫶'].map(e => (
                    <button
                      key={e}
                      onClick={() => setCustomEmoji(e)}
                      className={`text-lg p-1.5 rounded-lg transition-colors ${customEmoji === e ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-muted'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">name your gift</p>
              <Input
                value={customGiftName}
                onChange={e => setCustomGiftName(e.target.value)}
                placeholder="breakfast in bed, a movie night, a back rub..."
                className="rounded-full"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">describe it (optional — get creative!)</p>
              <Textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="a homemade coupon for one guilt-free nap... a promise to make dinner for a week... the world is yours"
                rows={3}
                className="rounded-xl resize-none"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">{customMessage.length}/200</p>
            </div>
            <Button
              onClick={sendCustomGift}
              disabled={sending !== null || !customGiftName.trim() || (balance !== null && balance < 100)}
              className="w-full rounded-full"
            >
              send custom gift · 100 credits
            </Button>
            {balance !== null && balance < 100 && (
              <p className="text-xs text-center text-destructive">not enough credits — grab some more?</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gift board */}
      {view === 'board' && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">my gift board 💝</h2>
            <p className="text-xs text-muted-foreground">all the love you've received — screenshot-worthy</p>
          </div>
          {boardGifts.length === 0 ? (
            <Card className="rounded-3xl border-border/50">
              <CardContent className="pt-8 pb-8 text-center space-y-2">
                <p className="text-3xl">🎁</p>
                <p className="text-sm text-muted-foreground">no gifts yet — but they'll come</p>
                <p className="text-xs text-muted-foreground">gifts from your person will show up here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {boardGifts.map(g => (
                <Card key={g.id} className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="pt-4 pb-3 px-3 text-center space-y-1">
                    <span className="text-3xl block">{g.emoji}</span>
                    <p className="text-xs font-semibold">{g.name}</p>
                    {g.custom_message && (
                      <p className="text-[11px] text-muted-foreground italic leading-tight">"{g.custom_message}"</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">from {g.sender_name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Buy credits */}
      {view === 'buy' && (
        <div className="space-y-4">
          <Card className="rounded-3xl border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">get more credits 💰</CardTitle>
              <CardDescription>top up your balance to keep spoiling your person</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {CREDIT_PACKS.map(pack => (
                <button
                  key={pack.credits}
                  onClick={() => buyCredits(pack)}
                  disabled={buying !== null}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{pack.credits}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{pack.credits} credits</p>
                    <p className="text-xs text-muted-foreground">{pack.label}</p>
                  </div>
                  <span className="text-sm font-bold">{buying === pack.credits ? '...' : pack.price}</span>
                </button>
              ))}
            </CardContent>
          </Card>
          <p className="text-xs text-center text-muted-foreground px-4">
            demo mode — no real charge yet. hook up Stripe (with a server webhook) to take live payments 🔐
          </p>
        </div>
      )}

      {/* History */}
      {view === 'history' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">gift history</h2>
          {sentGifts.length === 0 ? (
            <Card className="rounded-3xl border-border/50">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">no gifts sent yet — time to change that?</p>
              </CardContent>
            </Card>
          ) : (
            sentGifts.map(g => (
              <Card key={g.id} className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{g.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{g.name}</p>
                      {g.custom_message && <p className="text-xs text-muted-foreground italic">"{g.custom_message}"</p>}
                      <p className="text-xs text-muted-foreground">{new Date(g.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{g.cost}c</span>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
