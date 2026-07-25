import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/components/session-provider'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { DrawingCanvas } from '@/components/drawing-canvas'
import { StickerPicker } from '@/components/sticker-picker'
import { Plus, X, Image as ImageIcon, Pen, Gift, Smile, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  pairing_id: string
  sender_id: string
  body: string
  type: string
  media_url: string | null
  media_type: string | null
  request_status: string | null
  request_category: string | null
  created_at: string
}

const REQUEST_CATEGORIES = [
  { key: 'feed-me', emoji: '🍜', label: 'feed me' },
  { key: 'spoil-me', emoji: '💐', label: 'spoil me' },
  { key: 'errand', emoji: '🛒', label: 'errand' },
  { key: 'favor', emoji: '🤲', label: 'a favor' },
]

function getDeepLink(category: string | null, body: string) {
  const query = encodeURIComponent(body)
  if (category === 'feed-me') return `https://www.doordash.com/search/store/${query}`
  if (category === 'spoil-me') return `https://www.google.com/search?q=send+flowers+${query}`
  return null
}

export function ChatScreen() {
  const { user, pairing, partnerId } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [partnerName, setPartnerName] = useState<string | null>(null)
  const [showRequestComposer, setShowRequestComposer] = useState(false)
  const [requestBody, setRequestBody] = useState('')
  const [requestCategory, setRequestCategory] = useState<string | null>(null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showDrawing, setShowDrawing] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [showGiftComposer, setShowGiftComposer] = useState(false)
  const [giftName, setGiftName] = useState('')
  const [giftMessage, setGiftMessage] = useState('')
  const [giftEmoji, setGiftEmoji] = useState('🎁')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pairing || pairing.status !== 'active') return
    loadMessages()
    loadPartnerName()

    const channel = supabase
      .channel(`chat-${pairing.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `pairing_id=eq.${pairing.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new as Message])
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === (payload.new as Message).id ? payload.new as Message : m))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [pairing])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('pairing_id', pairing!.id)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function loadPartnerName() {
    if (!partnerId) return
    const { data } = await supabase.from('profiles').select('display_name').eq('id', partnerId).maybeSingle()
    setPartnerName(data?.display_name || 'your person')
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !pairing) return
    setSending(true)
    await supabase.from('messages').insert({
      pairing_id: pairing.id,
      body: body.trim(),
      type: 'text',
    })
    setBody('')
    setSending(false)
  }

  async function sendMedia(dataUrl: string, mediaType: 'image' | 'drawing' | 'sticker' | 'video', caption?: string) {
    if (!pairing) return
    setSending(true)
    const defaultBody =
      mediaType === 'drawing' ? '🎨 drew something for you'
      : mediaType === 'sticker' ? '💝'
      : mediaType === 'video' ? '🎥'
      : '📸'
    await supabase.from('messages').insert({
      pairing_id: pairing.id,
      body: caption || defaultBody,
      type: 'media',
      media_url: dataUrl,
      media_type: mediaType,
    })
    setSending(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast('please pick an image or video')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('file too large — keep it under 5MB')
      return
    }
    const isVideo = file.type.startsWith('video/')
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      sendMedia(dataUrl, isVideo ? 'video' : 'image')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
    setShowMoreMenu(false)
  }

  async function handleDrawingSend(dataUrl: string) {
    await sendMedia(dataUrl, 'drawing')
    setShowDrawing(false)
  }

  async function handleSaveSticker(dataUrl: string) {
    const name = prompt('name your sticker:') || 'custom sticker'
    await supabase.from('stickers').insert({ name, image_data: dataUrl })
    toast('sticker saved! find it in your sticker library 🎨')
  }

  async function handleStickerSelect(imageData: string) {
    await sendMedia(imageData, 'sticker')
    setShowStickers(false)
  }

  async function sendGiftInChat() {
    if (!giftName.trim() || !pairing || !partnerId) return
    setSending(true)
    // Deduct 100 credits
    const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user!.id).maybeSingle()
    const currentBalance = wallet?.balance ?? 500
    if (currentBalance < 100) {
      toast("not enough credits for a custom gift 💸")
      setSending(false)
      return
    }
    if (!wallet) {
      await supabase.from('wallets').insert({ balance: 400 })
    } else {
      await supabase.from('wallets').update({ balance: currentBalance - 100, updated_at: new Date().toISOString() }).eq('user_id', user!.id)
    }
    await supabase.from('gifts').insert({
      recipient_id: partnerId,
      pairing_id: pairing.id,
      name: giftName.trim(),
      emoji: giftEmoji,
      cost: 100,
      custom_message: giftMessage.trim() || null,
    })
    // Also send as a chat message
    await supabase.from('messages').insert({
      pairing_id: pairing.id,
      body: `${giftEmoji} sent you a gift: ${giftName.trim()}${giftMessage ? ` — "${giftMessage.trim()}"` : ''}`,
      type: 'gift',
    })
    setGiftName('')
    setGiftMessage('')
    setGiftEmoji('🎁')
    setShowGiftComposer(false)
    toast(`gift sent! 🎁`)
    setSending(false)
  }

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!requestBody.trim() || !pairing) return
    setSending(true)
    await supabase.from('messages').insert({
      pairing_id: pairing.id,
      body: requestBody.trim(),
      type: 'request',
      request_status: 'open',
      request_category: requestCategory,
    })
    setRequestBody('')
    setRequestCategory(null)
    setShowRequestComposer(false)
    setSending(false)
  }

  async function acceptRequest(id: string) {
    await supabase.from('messages').update({ request_status: 'accepted' }).eq('id', id)
  }

  async function markDone(id: string) {
    await supabase.from('messages').update({ request_status: 'done' }).eq('id', id)
  }

  if (!pairing || pairing.status !== 'active') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <p className="text-muted-foreground">connect with your person to start chatting</p>
      </div>
    )
  }

  if (showDrawing) {
    return <DrawingCanvas onSend={handleDrawingSend} onSaveSticker={handleSaveSticker} onClose={() => setShowDrawing(false)} />
  }

  return (
    <div className="flex flex-col h-[calc(100svh-4rem)]">
      <div className="border-b border-border/50 px-4 py-3">
        <h2 className="font-semibold">{partnerName || 'chat'}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground">it's quiet in here... someone say something cute 💬</p>
          </div>
        )}
        {messages.map(msg => {
          if (msg.type === 'request') {
            return <RequestCard key={msg.id} msg={msg} isMine={msg.sender_id === user?.id} onAccept={() => acceptRequest(msg.id)} onDone={() => markDone(msg.id)} />
          }
          if (msg.type === 'media' && msg.media_url) {
            return <MediaBubble key={msg.id} msg={msg} isMine={msg.sender_id === user?.id} />
          }
          if (msg.type === 'gift') {
            return <GiftBubble key={msg.id} msg={msg} isMine={msg.sender_id === user?.id} />
          }
          return (
            <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
              }`}>
                {msg.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Sticker picker */}
      {showStickers && (
        <StickerPicker onSelect={handleStickerSelect} onClose={() => setShowStickers(false)} />
      )}

      {/* Gift composer */}
      {showGiftComposer && (
        <div className="border-t border-border/50 p-4 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">send a custom gift (100 credits)</p>
            <button onClick={() => setShowGiftComposer(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="text"
              value={giftEmoji}
              onChange={e => {
                const val = e.target.value
                const emojis = [...val].filter(ch => /\p{Emoji}/u.test(ch) && !/\d/u.test(ch))
                if (emojis.length > 0) setGiftEmoji(emojis[emojis.length - 1])
              }}
              className="h-11 w-11 text-2xl text-center rounded-xl border-2 border-primary/30 bg-primary/5 focus:border-primary outline-none shrink-0"
              aria-label="emoji for gift"
            />
            <Input
              value={giftName}
              onChange={e => setGiftName(e.target.value)}
              placeholder="name your gift"
              className="rounded-full flex-1"
              maxLength={60}
            />
          </div>
          <Input
            value={giftMessage}
            onChange={e => setGiftMessage(e.target.value)}
            placeholder="add a message (optional)"
            className="rounded-full"
            maxLength={200}
          />
          <Button onClick={sendGiftInChat} disabled={sending || !giftName.trim()} className="w-full rounded-full">
            send gift · 100 credits
          </Button>
        </div>
      )}

      {/* Request composer */}
      {showRequestComposer && (
        <div className="border-t border-border/50 p-4 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">put in a request 🥺</p>
            <button onClick={() => setShowRequestComposer(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {REQUEST_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setRequestCategory(requestCategory === cat.key ? null : cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  requestCategory === cat.key ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 hover:bg-muted'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
          <form onSubmit={sendRequest} className="flex gap-2">
            <Input value={requestBody} onChange={e => setRequestBody(e.target.value)} placeholder="soup. the good kind. you know the one." className="flex-1 rounded-full" />
            <Button type="submit" disabled={sending || !requestBody.trim()} className="rounded-full">send</Button>
          </form>
        </div>
      )}

      {/* More menu */}
      {showMoreMenu && !showRequestComposer && !showGiftComposer && (
        <div className="border-t border-border/50 p-3 bg-card">
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => { fileInputRef.current?.click(); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-[10px] text-muted-foreground">photo</span>
            </button>
            <button onClick={() => { setShowDrawing(true); setShowMoreMenu(false); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Pen className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-[10px] text-muted-foreground">draw</span>
            </button>
            <button onClick={() => { setShowGiftComposer(true); setShowMoreMenu(false); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors">
              <div className="h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Gift className="h-5 w-5 text-pink-600" />
              </div>
              <span className="text-[10px] text-muted-foreground">gift</span>
            </button>
            <button onClick={() => { setShowStickers(!showStickers); setShowMoreMenu(false); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors">
              <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Smile className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-[10px] text-muted-foreground">stickers</span>
            </button>
          </div>
          <button onClick={() => { setShowRequestComposer(true); setShowMoreMenu(false); }} className="w-full mt-2 p-2.5 rounded-xl border border-border/50 hover:bg-muted transition-colors text-xs text-muted-foreground">
            🤲 put in a request
          </button>
        </div>
      )}

      {/* Normal input */}
      {!showRequestComposer && !showGiftComposer && (
        <form onSubmit={send} className="border-t border-border/50 p-3 flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex items-center justify-center h-9 w-9 rounded-full border transition-colors shrink-0 ${showMoreMenu ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 hover:bg-muted'}`}
          >
            {showMoreMenu ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
          <Input value={body} onChange={e => setBody(e.target.value)} placeholder="type something..." disabled={sending} className="flex-1 rounded-full h-9" />
          <Button type="submit" disabled={sending || !body.trim()} size="sm" className="rounded-full h-9 w-9 p-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageUpload} />
    </div>
  )
}

function MediaBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-2xl overflow-hidden ${isMine ? 'bg-primary/5' : 'bg-muted'}`}>
        {msg.media_url && (
          msg.media_type === 'video' ? (
            <video src={msg.media_url} controls playsInline className="w-full max-h-64 object-contain rounded-2xl" />
          ) : (
            <img src={msg.media_url} alt="" className="w-full max-h-64 object-contain rounded-2xl" />
          )
        )}
        {msg.body && msg.body !== '📸' && msg.body !== '💝' && msg.body !== '🎥' && msg.body !== '🎨 drew something for you' && (
          <p className="text-xs text-muted-foreground px-3 py-1.5">{msg.body}</p>
        )}
      </div>
    </div>
  )
}

function GiftBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <Card className="max-w-[75%] rounded-2xl border-primary/20 shadow-sm bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20">
        <CardContent className="py-3 px-4">
          <p className="text-sm">{msg.body}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function RequestCard({ msg, isMine, onAccept, onDone }: { msg: Message; isMine: boolean; onAccept: () => void; onDone: () => void }) {
  const catEmoji = REQUEST_CATEGORIES.find(c => c.key === msg.request_category)?.emoji || '🤲'
  const deepLink = getDeepLink(msg.request_category, msg.body)

  let statusLabel = ''
  if (msg.request_status === 'open') statusLabel = 'open'
  else if (msg.request_status === 'accepted') statusLabel = 'on it 💪'
  else if (msg.request_status === 'done') statusLabel = 'delivered 🎉'

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <Card className="max-w-[80%] rounded-2xl coupon border-primary/30 bg-primary/5 shadow-sm tilt-r-sm">
        <CardContent className="py-3 px-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl shrink-0">{catEmoji}</span>
            <p className="text-sm font-semibold flex-1">{msg.body}</p>
          </div>
          <div className="flex items-center gap-2 justify-between">
            <span className="text-xs text-muted-foreground">{statusLabel}</span>
            {!isMine && msg.request_status === 'open' && (
              <Button size="sm" variant="outline" className="rounded-full text-xs h-7" onClick={onAccept}>
                say less ✅
              </Button>
            )}
            {!isMine && msg.request_status === 'accepted' && (
              <div className="flex gap-1">
                {deepLink && (
                  <Button size="sm" variant="outline" className="rounded-full text-xs h-7" onClick={() => window.open(deepLink, '_blank')}>
                    make it happen →
                  </Button>
                )}
                <Button size="sm" variant="outline" className="rounded-full text-xs h-7" onClick={onDone}>
                  done 🎉
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
