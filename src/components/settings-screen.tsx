import { useState, useEffect } from 'react'
import { useSession } from '@/components/session-provider'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface SharingSettings {
  share_phase: boolean
  share_symptoms: boolean
  share_mood: boolean
}

export function SettingsScreen() {
  const { user, profile, pairing, refreshProfile, signOut } = useSession()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sharing, setSharing] = useState<SharingSettings>({
    share_phase: true,
    share_symptoms: false,
    share_mood: false,
  })
  const [sharingLoaded, setSharingLoaded] = useState(false)

  useEffect(() => {
    setDisplayName(profile?.display_name || '')
  }, [profile])

  useEffect(() => {
    if (user) loadSharing()
  }, [user])

  async function loadSharing() {
    const { data } = await supabase
      .from('sharing_settings')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle()
    if (data) {
      setSharing({ share_phase: data.share_phase, share_symptoms: data.share_symptoms, share_mood: data.share_mood })
    }
    setSharingLoaded(true)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    await supabase.from('profiles').update({ display_name: displayName }).eq('id', user!.id)
    await refreshProfile()
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  async function updateSharing(field: keyof SharingSettings, value: boolean) {
    const updated = { ...sharing, [field]: value }
    setSharing(updated)
    const { error } = await supabase.from('sharing_settings').upsert({
      user_id: user!.id,
      ...updated,
    })
    if (error) {
      setSharing(sharing)
    }
  }

  async function unpair() {
    if (!pairing) return
    if (!confirm('are you sure? this will disconnect you from your partner.')) return
    await supabase.from('pairings').update({
      status: 'unsynced',
      ended_at: new Date().toISOString(),
    }).eq('id', pairing.id)
    window.location.reload()
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>your profile</CardTitle>
        </CardHeader>
        <form onSubmit={saveProfile}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">name</Label>
              <Input id="display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving} className="rounded-full">
                {saving ? 'saving...' : 'save'}
              </Button>
              {saved && <span className="text-sm text-emerald-500">saved!</span>}
            </div>
          </CardContent>
        </form>
      </Card>

      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>what you share</CardTitle>
          <CardDescription>you can change this anytime — it's your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sharingLoaded && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">cycle phase</p>
                  <p className="text-xs text-muted-foreground">where you are in your cycle</p>
                </div>
                <Switch checked={sharing.share_phase} onCheckedChange={v => updateSharing('share_phase', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">symptoms</p>
                  <p className="text-xs text-muted-foreground">things you log each day</p>
                </div>
                <Switch checked={sharing.share_symptoms} onCheckedChange={v => updateSharing('share_symptoms', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">mood</p>
                  <p className="text-xs text-muted-foreground">how you're feeling</p>
                </div>
                <Switch checked={sharing.share_mood} onCheckedChange={v => updateSharing('share_mood', v)} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {pairing?.status === 'active' && (
        <Card className="rounded-3xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>connection</CardTitle>
            <CardDescription>you're synced with your person</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={unpair} className="rounded-full">
              disconnect
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      <Button variant="outline" className="w-full rounded-full" onClick={signOut}>
        sign out
      </Button>
    </div>
  )
}
