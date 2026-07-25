import { useState } from 'react'
import { useSession } from '@/components/session-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">CycleSync</h1>
          <p className="text-muted-foreground">every phase, together.</p>
        </div>
        {mode === 'signin' ? (
          <SignInForm onSwitch={() => setMode('signup')} />
        ) : (
          <SignUpForm onSwitch={() => setMode('signin')} />
        )}
      </div>
    </div>
  )
}

function SignInForm({ onSwitch }: { onSwitch: () => void }) {
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
    <Card className="rounded-3xl shadow-sm border-border/50">
      <CardHeader>
        <CardTitle>welcome back</CardTitle>
        <CardDescription>sign in to your space</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="rounded-xl" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading ? 'signing in...' : 'sign in'}
          </Button>
          <Button type="button" variant="link" onClick={onSwitch} className="text-sm text-muted-foreground">
            new here? create an account
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
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
    <Card className="rounded-3xl shadow-sm border-border/50">
      <CardHeader>
        <CardTitle>let's get started</CardTitle>
        <CardDescription>create your account — it's quick</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
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
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading ? 'creating...' : 'join cyclesync'}
          </Button>
          <Button type="button" variant="link" onClick={onSwitch} className="text-sm text-muted-foreground">
            already have an account? sign in
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
