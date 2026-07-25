import { useState, useEffect } from 'react'
import { useSession, type Role } from '@/components/session-provider'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PairingCeremony } from '@/components/pairing-ceremony'

export function OnboardingScreen() {
  const { user, profile, refreshProfile } = useSession()
  const [step, setStep] = useState(profile?.onboarding_step || 1)
  const [showCeremony, setShowCeremony] = useState(false)

  useEffect(() => {
    if (profile) setStep(profile.onboarding_step)
  }, [profile])

  async function saveStep(nextStep: number) {
    await supabase.from('profiles').update({ onboarding_step: nextStep }).eq('id', user!.id)
    await refreshProfile()
  }

  async function finishOnboarding() {
    await supabase.from('profiles').update({ onboarding_complete: true, onboarding_step: 7 }).eq('id', user!.id)
    await refreshProfile()
  }

  if (showCeremony) {
    return <PairingCeremony onDone={finishOnboarding} />
  }

  // Step 1 is auth (already done if we're here)
  // Step 2: Name
  if (step <= 2) {
    return <StepName userId={user!.id} currentName={profile?.display_name || null} onNext={() => saveStep(3)} />
  }
  // Step 3: Role
  if (step === 3) {
    return <StepRole userId={user!.id} onNext={(role) => {
      if (role === 'supporter') {
        saveStep(6) // skip cycle + sharing
      } else {
        saveStep(4)
      }
    }} />
  }
  // Step 4: Cycle setup (tracker/both only)
  if (step === 4) {
    return <StepCycle onNext={() => saveStep(5)} onSkip={() => saveStep(5)} />
  }
  // Step 5: Sharing dial (tracker/both only)
  if (step === 5) {
    return <StepSharing userId={user!.id} onNext={() => saveStep(6)} />
  }
  // Step 6: Pairing
  if (step === 6) {
    return <StepPairing
      onPaired={() => setShowCeremony(true)}
      onSkip={finishOnboarding}
    />
  }

  // Fallback
  return null
}

function StepName({ userId, currentName, onNext }: { userId: string; currentName: string | null; onNext: () => void }) {
  const [name, setName] = useState(currentName || '')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', userId)
    onNext()
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">hi. this app is for the two of you. mostly so nobody has to ask "are you mad at me" ever again 💌</p>
        </div>
        <Card className="rounded-3xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>what should your person call you here?</CardTitle>
          </CardHeader>
          <form onSubmit={submit}>
            <CardContent className="space-y-4">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="your name" className="rounded-xl" />
              <Button type="submit" className="w-full rounded-full" disabled={saving || !name.trim()}>
                {saving ? 'saving...' : 'next'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  )
}

function StepRole({ userId, onNext }: { userId: string; onNext: (role: Role) => void }) {
  const [saving, setSaving] = useState(false)

  async function pick(role: Role) {
    setSaving(true)
    await supabase.from('profiles').update({ role }).eq('id', userId)
    onNext(role)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight leading-snug">quick q — are you tracking a <span className="inline-block rounded-full bg-primary/10 px-2 text-primary">cycle</span> in here?</h1>
        </div>
        <div className="space-y-3">
          <Button onClick={() => pick('tracker')} variant="outline" className="w-full h-auto py-4 rounded-2xl text-left flex flex-col items-start gap-1" disabled={saving}>
            <span className="font-semibold">yep, that's me 🩸</span>
          </Button>
          <Button onClick={() => pick('supporter')} variant="outline" className="w-full h-auto py-4 rounded-2xl text-left flex flex-col items-start gap-1" disabled={saving}>
            <span className="font-semibold">i'm the support squad 🫶</span>
          </Button>
          <Button onClick={() => pick('both')} variant="outline" className="w-full h-auto py-4 rounded-2xl text-left flex flex-col items-start gap-1" disabled={saving}>
            <span className="font-semibold">both, we contain multitudes ✨</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function StepCycle({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [lastPeriod, setLastPeriod] = useState('')
  const [cycleLength, setCycleLength] = useState('28')
  const [periodLength, setPeriodLength] = useState('5')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!lastPeriod) return
    setSaving(true)
    await supabase.from('cycles').insert({
      last_period_start: lastPeriod,
      avg_cycle_length: parseInt(cycleLength),
      avg_period_length: parseInt(periodLength),
    })
    onNext()
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>okay tell us about your cycle</CardTitle>
          <CardDescription>ballpark is fine, we're not the FBI</CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period-start">when did your last period start?</Label>
              <Input id="period-start" type="date" value={lastPeriod} onChange={e => setLastPeriod(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cycle-len">average cycle length (days)</Label>
              <Input id="cycle-len" type="number" min={21} max={45} value={cycleLength} onChange={e => setCycleLength(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-len">average period length (days)</Label>
              <Input id="period-len" type="number" min={2} max={10} value={periodLength} onChange={e => setPeriodLength(e.target.value)} className="rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 rounded-full" disabled={saving || !lastPeriod}>
                {saving ? 'saving...' : 'next'}
              </Button>
              <Button type="button" variant="ghost" onClick={onSkip} disabled={saving} className="rounded-full text-sm">
                idk rn — i'll add it later
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

function StepSharing({ userId, onNext }: { userId: string; onNext: () => void }) {
  const [level, setLevel] = useState<'phase' | 'phase_symptoms' | 'full'>('phase')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const settings = {
      user_id: userId,
      share_phase: true,
      share_symptoms: level === 'phase_symptoms' || level === 'full',
      share_mood: level === 'full',
    }
    await supabase.from('sharing_settings').upsert(settings)
    onNext()
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">what can your person see?</h1>
          <p className="text-sm text-muted-foreground">your body, your call 🔐</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => setLevel('phase')}
            className={`w-full p-4 rounded-2xl border text-left transition-colors ${level === 'phase' ? 'border-primary bg-primary/5' : 'border-border/50 hover:bg-muted'}`}
          >
            <p className="font-semibold text-sm">just my phase</p>
            <p className="text-xs text-muted-foreground">they'll see where you are in your cycle</p>
          </button>
          <button
            onClick={() => setLevel('phase_symptoms')}
            className={`w-full p-4 rounded-2xl border text-left transition-colors ${level === 'phase_symptoms' ? 'border-primary bg-primary/5' : 'border-border/50 hover:bg-muted'}`}
          >
            <p className="font-semibold text-sm">phase + symptoms</p>
            <p className="text-xs text-muted-foreground">phase plus things you log each day</p>
          </button>
          <button
            onClick={() => setLevel('full')}
            className={`w-full p-4 rounded-2xl border text-left transition-colors ${level === 'full' ? 'border-primary bg-primary/5' : 'border-border/50 hover:bg-muted'}`}
          >
            <p className="font-semibold text-sm">the full weather report</p>
            <p className="text-xs text-muted-foreground">phase, symptoms, and mood</p>
          </button>
        </div>
        <Button onClick={submit} className="w-full rounded-full" disabled={saving}>
          {saving ? 'saving...' : 'next'}
        </Button>
        <p className="text-xs text-center text-muted-foreground">change this anytime. seriously, anytime.</p>
      </div>
    </div>
  )
}

function StepPairing({ onPaired, onSkip }: { onPaired: () => void; onSkip: () => void }) {
  const { user, pairing, refreshPairing } = useSession()
  const [code, setCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [waiting, setWaiting] = useState(false)

  useEffect(() => {
    if (!waiting || !pairing) return
    const channel = supabase
      .channel(`pairing-wait-${pairing.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pairings',
        filter: `id=eq.${pairing.id}`,
      }, (payload) => {
        if ((payload.new as any).status === 'active') {
          onPaired()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [waiting, pairing])

  async function createCode() {
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
      setError(err.message)
    } else {
      setGeneratedCode(newCode)
      await refreshPairing()
      setWaiting(true)
    }
    setLoading(false)
  }

  async function joinCode() {
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
      setError(err.message)
    } else {
      await refreshPairing()
      onPaired()
    }
    setLoading(false)
  }

  if (waiting && generatedCode) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">your <span className="inline-block rounded-full bg-primary/10 px-2 text-primary">couple code</span> 👇</h1>
          <p className="text-sm text-muted-foreground">send it to your person</p>
          <div className="coupon tilt-r-sm rounded-3xl border-primary/40 bg-primary/5 p-6 relative">
            <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background" />
            <span className="absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">one couple code</p>
            <span className="text-4xl font-mono font-extrabold tracking-[0.3em]">{generatedCode}</span>
          </div>
          <p className="text-sm text-muted-foreground">waiting for them to show up... classic 🕰️</p>
          <Button variant="ghost" onClick={onSkip} className="rounded-full text-sm">
            pair later — flying solo for now ✈️
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <Card className="rounded-3xl border-border/50 shadow-sm">
          <CardHeader className="text-center">
            <CardTitle>got a code from your person?</CardTitle>
            <CardDescription>drop it here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="ABC123"
              maxLength={6}
              className="font-mono text-center text-lg tracking-widest rounded-xl"
            />
            <Button onClick={joinCode} className="w-full rounded-full" disabled={loading || code.length < 4}>
              connect
            </Button>
          </CardContent>
        </Card>

        <div className="text-center space-y-3">
          <p className="text-xs text-muted-foreground">or create a code to share with them</p>
          <Button variant="outline" onClick={createCode} className="rounded-full" disabled={loading}>
            create a code
          </Button>
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={onSkip} className="rounded-full text-sm text-muted-foreground">
            pair later — flying solo for now ✈️
          </Button>
        </div>
      </div>
    </div>
  )
}
