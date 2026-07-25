import { useEffect, useState } from 'react'
import { useSession } from '@/components/session-provider'
import { supabase } from '@/lib/supabase'
import { PairingCeremony } from '@/components/pairing-ceremony'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function PairingScreen() {
  const { user, pairing, refreshPairing } = useSession()
  const [code, setCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCeremony, setShowCeremony] = useState(false)

  // When we're the creator waiting on a pending code, listen for the partner
  // joining so the screen advances automatically instead of needing a refresh.
  const isPendingCreator = pairing?.status === 'pending' && pairing.user_a === user?.id
  useEffect(() => {
    if (!isPendingCreator || !pairing) return
    const channel = supabase
      .channel(`pairing-wait-${pairing.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pairings',
        filter: `id=eq.${pairing.id}`,
      }, (payload) => {
        if ((payload.new as { status?: string }).status === 'active') {
          setShowCeremony(true)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isPendingCreator, pairing?.id])

  async function createPairing() {
    if (!user) return
    setError(null)
    setLoading(true)
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { error: err } = await supabase.from('pairings').insert({
      code: newCode,
      user_a: user.id,
      status: 'pending',
    })
    if (err) {
      if (err.message.includes('idx_one_active_pairing')) {
        setError('you already have an active connection.')
      } else {
        setError(err.message)
      }
    } else {
      setGeneratedCode(newCode)
      await refreshPairing()
    }
    setLoading(false)
  }

  async function joinPairing() {
    if (!user) return
    setError(null)
    setLoading(true)

    const { data: existing } = await supabase
      .from('pairings')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('status', 'pending')
      .is('user_b', null)
      .maybeSingle()

    if (!existing) {
      setError("hmm, that code didn't work — double-check with your partner?")
      setLoading(false)
      return
    }

    if (existing.user_a === user.id) {
      setError("that's your own code, silly!")
      setLoading(false)
      return
    }

    const { error: err } = await supabase
      .from('pairings')
      .update({ user_b: user.id, status: 'active', activated_at: new Date().toISOString() })
      .eq('id', existing.id)

    if (err) {
      if (err.message.includes('idx_one_active_pairing')) {
        setError('you already have an active connection.')
      } else {
        setError(err.message)
      }
    } else {
      setShowCeremony(true)
    }
    setLoading(false)
  }

  if (showCeremony) {
    return <PairingCeremony onDone={async () => { await refreshPairing(); setShowCeremony(false) }} />
  }

  if (pairing?.status === 'pending' && pairing.user_a === user?.id) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <Card className="w-full max-w-sm rounded-3xl shadow-sm border-border/50">
          <CardHeader className="text-center">
            <CardTitle>waiting for your person</CardTitle>
            <CardDescription>share this code with them so they can connect with you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center rounded-2xl bg-muted p-6">
              <span className="text-3xl font-mono font-bold tracking-widest">{pairing.code}</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              they'll enter this after signing up — you'll both know when it happens 💞
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-3xl shadow-sm border-border/50">
        <CardHeader className="text-center">
          <CardTitle>connect with your person</CardTitle>
          <CardDescription>
            one of you creates a code, the other enters it — that's it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          {generatedCode && (
            <div className="rounded-2xl bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">your code:</p>
              <p className="text-2xl font-mono font-bold tracking-widest">{generatedCode}</p>
            </div>
          )}
          <Button onClick={createPairing} className="w-full rounded-full" disabled={loading || !!generatedCode}>
            {loading ? 'creating...' : 'create a code'}
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="join-code">enter their code</Label>
            <Input
              id="join-code"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="ABC123"
              maxLength={6}
              className="font-mono text-center text-lg tracking-widest rounded-xl"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={joinPairing} className="w-full rounded-full" disabled={loading || code.length < 4}>
            connect
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
