import { useState } from 'react'
import { useSession } from '@/components/session-provider'
import { ERAS } from '@/lib/eras'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

type Mode = 'signin' | 'signup' | 'forgot'

// Warm, era-neutral gradient for the whole auth surface.
const AUTH_BG = 'linear-gradient(160deg, #FCE9D9 0%, #F7DCE4 45%, #E9E1F5 100%)'
const ACCENT = ERAS.ovulatory.accent // warm coral
const ACCENT_SOFT = ERAS.ovulatory.accentSoft

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full px-2 py-0.5" style={{ background: ACCENT_SOFT, color: ACCENT }}>
      {children}
    </span>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden p-4" style={{ background: AUTH_BG }}>
      <div className="era-blob" style={{ background: ACCENT, width: 280, height: 280, top: -80, left: -60 }} />
      <div className="era-blob" style={{ background: ERAS.luteal.accent, width: 240, height: 240, bottom: -70, right: -50, opacity: 0.22 }} />
      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="mx-auto mb-1 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-card era-shadow tilt-r">
            <span className="text-3xl">🌸</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: '#4a2338' }}>CycleSync</h1>
          <p className="text-sm font-medium" style={{ color: '#7a5866' }}>every phase, together.</p>
          <div className="flex justify-center gap-1.5 pt-1 text-lg opacity-80">
            <span className="tilt-l-sm">🌧️</span>
            <span>🌱</span>
            <span className="tilt-r-sm">☀️</span>
            <span>🌙</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin')

  return (
    <AuthShell>
      {mode === 'signin' && <SignInForm onSignUp={() => setMode('signup')} onForgot={() => setMode('forgot')} />}
      {mode === 'signup' && <SignUpForm onSignIn={() => setMode('signin')} />}
      {mode === 'forgot' && <ForgotForm onBack={() => setMode('signin')} />}
    </AuthShell>
  )
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="rounded-[26px] era-shadow border-white/60 bg-card/95 backdrop-blur-sm fade-rise">
      <CardContent className="pt-6 pb-6">{children}</CardContent>
    </Card>
  )
}

function SignInForm({ onSignUp, onForgot }: { onSignUp: () => void; onForgot: () => void }) {
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) setError(err)
    setLoading(false)
  }

  return (
    <FormCard>
      <div className="space-y-1 mb-4">
        <h2 className="text-2xl font-extrabold">welcome <Highlight>back</Highlight> 🤍</h2>
        <p className="text-sm text-muted-foreground">sign in to your space</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="email">email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">password</Label>
            <button type="button" onClick={onForgot} className="text-xs font-medium" style={{ color: ACCENT }}>
              forgot?
            </button>
          </div>
          <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="rounded-xl" />
        </div>
        <Button type="submit" className="w-full rounded-full" disabled={loading}>
          {loading ? 'signing in...' : 'sign in'}
        </Button>
        <button type="button" onClick={onSignUp} className="w-full text-sm text-muted-foreground">
          new here? <span className="font-semibold" style={{ color: ACCENT }}>create an account</span>
        </button>
      </form>
    </FormCard>
  )
}

function SignUpForm({ onSignIn }: { onSignIn: () => void }) {
  const { signUp } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signUp(email, password, displayName || undefined)
    if (err) setError(err)
    setLoading(false)
  }

  return (
    <FormCard>
      <div className="space-y-1 mb-4">
        <h2 className="text-2xl font-extrabold">let's get <Highlight>started</Highlight> ✨</h2>
        <p className="text-sm text-muted-foreground">create your account — it's quick</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="name">what should we call you?</Label>
          <Input id="name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="your name" className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">email</Label>
          <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">password</Label>
          <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="rounded-xl" />
          <p className="text-xs text-muted-foreground">at least 6 characters</p>
        </div>
        <Button type="submit" className="w-full rounded-full" disabled={loading}>
          {loading ? 'creating...' : 'join cyclesync'}
        </Button>
        <button type="button" onClick={onSignIn} className="w-full text-sm text-muted-foreground">
          already have an account? <span className="font-semibold" style={{ color: ACCENT }}>sign in</span>
        </button>
      </form>
    </FormCard>
  )
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useSession()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    setSent(true)
    toast('check your email for a reset link 💌')
  }

  return (
    <FormCard>
      <div className="space-y-1 mb-4">
        <h2 className="text-2xl font-extrabold">reset your <Highlight>password</Highlight> 🔑</h2>
        <p className="text-sm text-muted-foreground">we'll email you a link to set a new one</p>
      </div>
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-2xl p-4 text-sm" style={{ background: ACCENT_SOFT, color: ACCENT }}>
            📬 if an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way. check your inbox (and spam).
          </div>
          <Button type="button" onClick={onBack} className="w-full rounded-full">back to sign in</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="forgot-email">email</Label>
            <Input id="forgot-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={loading || !email}>
            {loading ? 'sending...' : 'send reset link'}
          </Button>
          <button type="button" onClick={onBack} className="w-full text-sm text-muted-foreground">
            ← back to sign in
          </button>
        </form>
      )}
    </FormCard>
  )
}

// Shown when a user returns from the "reset password" email link.
export function ResetPasswordScreen() {
  const { updatePassword } = useSession()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError("passwords don't match")
      return
    }
    setLoading(true)
    const { error: err } = await updatePassword(password)
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    toast('password updated — you\'re all set 🎉')
  }

  return (
    <AuthShell>
      <FormCard>
        <div className="space-y-1 mb-4">
          <h2 className="text-2xl font-extrabold">set a new <Highlight>password</Highlight> 🔒</h2>
          <p className="text-sm text-muted-foreground">almost done — pick something you'll remember</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="new-password">new password</Label>
            <Input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">confirm password</Label>
            <Input id="confirm-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} className="rounded-xl" />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading ? 'saving...' : 'update password'}
          </Button>
        </form>
      </FormCard>
    </AuthShell>
  )
}
