import { useEffect, useState } from 'react'
import { useSession } from '@/components/session-provider'
import { supabase } from '@/lib/supabase'
import { getCycleInfo, PHASE_INFO, type Phase } from '@/lib/cycle'
import { ERAS, eraGradient } from '@/lib/eras'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { PairingScreen } from '@/components/pairing-screen'
import { CalendarDays, Pencil } from 'lucide-react'
import { toast } from 'sonner'

type Screen = 'home' | 'chat' | 'notify' | 'gifts' | 'settings'

const PHASE_GIFT_PICKS: Record<string, { name: string; emoji: string; cost: number; reason: string }[]> = {
  menstrual: [
    { name: 'dark chocolate', emoji: '🍫', cost: 40, reason: 'magnesium + dopamine = survival kit' },
    { name: 'heating pad', emoji: '🔥', cost: 80, reason: 'cramps are no joke — warmth helps' },
  ],
  follicular: [
    { name: 'energy smoothie', emoji: '🥤', cost: 45, reason: 'fuel the comeback' },
    { name: 'fresh flowers', emoji: '💐', cost: 75, reason: 'match the fresh energy' },
  ],
  ovulatory: [
    { name: 'flowers bouquet', emoji: '🌸', cost: 90, reason: 'glow era deserves glow things' },
    { name: 'a date night', emoji: '🥂', cost: 150, reason: 'high energy + high mood = go do something' },
  ],
  luteal: [
    { name: 'comfort chocolate', emoji: '🍫', cost: 40, reason: 'cravings are real — satisfy them' },
    { name: 'sanitary pads (prepping)', emoji: '🩹', cost: 35, reason: "period's coming — stock up" },
  ],
}

const WEATHER_OPTIONS = [
  { icon: '☀️', label: 'thriving' },
  { icon: '🌤️', label: 'decent' },
  { icon: '🌧️', label: 'fragile' },
  { icon: '⛈️', label: 'do not perceive me' },
]

const FLOW_OPTIONS = [
  { key: 'none', label: 'none', emoji: '·' },
  { key: 'light', label: 'light', emoji: '💧' },
  { key: 'medium', label: 'medium', emoji: '🩸' },
  { key: 'heavy', label: 'heavy', emoji: '🌊' },
]

const SYMPTOM_OPTIONS = [
  { key: 'cramps', label: 'cramps', emoji: '😣' },
  { key: 'headache', label: 'headache', emoji: '🤕' },
  { key: 'bloating', label: 'bloating', emoji: '🎈' },
  { key: 'fatigue', label: 'fatigue', emoji: '🥱' },
  { key: 'tender', label: 'tender', emoji: '💢' },
  { key: 'nausea', label: 'nausea', emoji: '🤢' },
  { key: 'backache', label: 'backache', emoji: '🪫' },
  { key: 'moody', label: 'moody', emoji: '🌀' },
]

const SELF_PHASE_LINES: Record<string, string> = {
  menstrual: "day one energy: your body's doing a lot. resting IS the productivity 💛",
  follicular: "main character energy loading — this phase tends to hit different ✨",
  ovulatory: "peak vibes era for a lot of people. enjoy the glow ☀️",
  luteal: "if everything's slightly annoying today — that's the hormones plot-twisting, not you 💛",
}

interface CycleData {
  id: string
  user_id: string
  last_period_start: string
  avg_cycle_length: number
  avg_period_length: number
}

interface DailyLog {
  id: string
  log_date: string
  flow: string | null
  symptoms: string[] | null
  note: string | null
}

interface SharingSettings {
  share_phase: boolean
  share_mood: boolean
  share_symptoms: boolean
}

function todayStr() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function DashboardScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user, profile, pairing, partnerId, refreshProfile } = useSession()
  const [cycle, setCycle] = useState<CycleData | null>(null)
  const [partnerCycle, setPartnerCycle] = useState<CycleData | null>(null)
  const [partnerProfile, setPartnerProfile] = useState<{ display_name: string | null; weather: string | null; role: string | null } | null>(null)
  const [partnerSharing, setPartnerSharing] = useState<SharingSettings | null>(null)
  const [myLog, setMyLog] = useState<DailyLog | null>(null)
  const [partnerLog, setPartnerLog] = useState<DailyLog | null>(null)
  const [settingWeather, setSettingWeather] = useState(false)
  const [editingWeather, setEditingWeather] = useState(false)
  const [showPairing, setShowPairing] = useState(false)

  const isTracker = profile?.role === 'tracker' || profile?.role === 'both'
  const partnerIsTracker = partnerProfile?.role === 'tracker' || partnerProfile?.role === 'both'
  const isPaired = pairing?.status === 'active'

  // Privacy gating — what the partner has chosen to share with us.
  const partnerSharesPhase = partnerSharing?.share_phase !== false
  const partnerSharesMood = partnerSharing?.share_mood === true
  const partnerSharesSymptoms = partnerSharing?.share_symptoms === true

  useEffect(() => {
    if (user && isTracker) { loadMyCycle(); loadMyLog() }
  }, [user, isTracker])

  useEffect(() => {
    if (partnerId && isPaired) loadPartnerData()
  }, [partnerId, isPaired])

  async function loadMyCycle() {
    const { data } = await supabase
      .from('cycles')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setCycle(data)
  }

  async function loadMyLog() {
    const { data } = await supabase
      .from('cycle_logs')
      .select('id, log_date, flow, symptoms, note')
      .eq('user_id', user!.id)
      .eq('log_date', todayStr())
      .maybeSingle()
    setMyLog(data as DailyLog | null)
  }

  async function loadPartnerData() {
    if (!partnerId) return
    const [cycleRes, profileRes, sharingRes, logRes] = await Promise.all([
      supabase.from('cycles').select('*').eq('user_id', partnerId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('profiles').select('display_name, weather, role').eq('id', partnerId).maybeSingle(),
      supabase.from('sharing_settings').select('share_phase, share_mood, share_symptoms').eq('user_id', partnerId).maybeSingle(),
      supabase.from('cycle_logs').select('id, log_date, flow, symptoms, note').eq('user_id', partnerId).eq('log_date', todayStr()).maybeSingle(),
    ])
    setPartnerCycle(cycleRes.data)
    setPartnerProfile(profileRes.data)
    setPartnerSharing(sharingRes.data as SharingSettings | null)
    setPartnerLog(logRes.data as DailyLog | null)
  }

  async function setWeather(emoji: string) {
    setSettingWeather(true)
    await supabase.from('profiles').update({ weather: emoji }).eq('id', user!.id)
    await refreshProfile()
    setSettingWeather(false)
    setEditingWeather(false)
  }

  async function logPeriod(dateStr: string, cycleLen: number, periodLen: number) {
    if (cycle) {
      await supabase.from('cycles').update({
        last_period_start: dateStr,
        avg_cycle_length: cycleLen,
        avg_period_length: periodLen,
        updated_at: new Date().toISOString(),
      }).eq('id', cycle.id)
    } else {
      await supabase.from('cycles').insert({
        last_period_start: dateStr,
        avg_cycle_length: cycleLen,
        avg_period_length: periodLen,
      })
    }
    await loadMyCycle()
    toast('period updated — your dates are locked in 📅')
  }

  async function saveLog(flow: string | null, symptoms: string[], note: string) {
    const payload = { flow, symptoms, note: note.trim() || null }
    if (myLog) {
      await supabase.from('cycle_logs').update(payload).eq('id', myLog.id)
    } else {
      await supabase.from('cycle_logs').insert({ log_date: todayStr(), ...payload })
    }
    await loadMyLog()
    toast("today's log saved 💾")
  }

  const myInfo = cycle ? getCycleInfo(cycle.last_period_start, cycle.avg_cycle_length, cycle.avg_period_length) : null
  const partnerInfo = partnerCycle ? getCycleInfo(partnerCycle.last_period_start, partnerCycle.avg_cycle_length, partnerCycle.avg_period_length) : null
  const partnerName = partnerProfile?.display_name || 'your person'

  if (showPairing) {
    return <PairingScreen />
  }

  // ── Dual-tracker layout ──────────────────────────────────────────────────
  if (isTracker && partnerIsTracker && isPaired) {
    return (
      <PageShell phase={myInfo?.phase}>
        <Greeting name={profile?.display_name || 'you'} phase={myInfo?.phase} />

        <div className="grid grid-cols-2 gap-3 relative z-10">
          <HeroMini name={profile?.display_name || 'you'} weather={profile?.weather} info={myInfo} isSelf onEditWeather={() => setEditingWeather(true)} delay={0} />
          <HeroMini
            name={partnerName}
            weather={partnerSharesMood ? partnerProfile?.weather : null}
            info={partnerSharesPhase ? partnerInfo : null}
            isSelf={false}
            hidden={!partnerSharesPhase}
            delay={60}
          />
        </div>

        {myInfo && <PhaseNote phase={myInfo.phase} perspective="self" delay={120} />}

        {myInfo && partnerInfo && partnerSharesPhase && (
          <OverlapInsight myPhase={myInfo.phase} partnerPhase={partnerInfo.phase} myName={profile?.display_name || 'you'} partnerName={partnerName} />
        )}

        {editingWeather || !profile?.weather ? (
          <WeatherPicker phase={myInfo?.phase} current={profile?.weather} onPick={setWeather} disabled={settingWeather} open={editingWeather} />
        ) : null}

        <DailyLogCard phase={myInfo?.phase} log={myLog} onSave={saveLog} />
        <PeriodLogCard phase={myInfo?.phase} cycle={cycle} onLog={logPeriod} />

        {partnerSharesSymptoms && partnerLog && <PartnerTodayCard name={partnerName} log={partnerLog} phase={partnerInfo?.phase} />}

        <GiftSuggestions phase={partnerInfo?.phase} partnerId={partnerId!} pairingId={pairing!.id} partnerName={partnerName} onNavigate={onNavigate} />
        <QuickActions onNavigate={onNavigate} />
      </PageShell>
    )
  }

  // ── Supporter layout ─────────────────────────────────────────────────────
  if (profile?.role === 'supporter' && isPaired) {
    return (
      <PageShell phase={partnerSharesPhase ? partnerInfo?.phase : undefined}>
        <Greeting name={profile?.display_name || 'you'} phase={partnerSharesPhase ? partnerInfo?.phase : undefined} supporter partnerName={partnerName} />

        {partnerSharesPhase && partnerInfo ? (
          <EraHero name={partnerName} weather={partnerSharesMood ? partnerProfile?.weather : null} info={partnerInfo} isSelf={false} />
        ) : (
          <Card className="rounded-3xl border-border/50 shadow-sm relative z-10">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{partnerName} is keeping their cycle private for now 🤍</p>
            </CardContent>
          </Card>
        )}

        {partnerSharesPhase && partnerInfo && (
          <PhaseNote phase={partnerInfo.phase} perspective="partner" name={partnerName} delay={80} />
        )}

        {partnerSharesSymptoms && partnerLog && <PartnerTodayCard name={partnerName} log={partnerLog} phase={partnerInfo?.phase} />}

        <SupporterActions phase={partnerSharesPhase ? partnerInfo?.phase : undefined} onNavigate={onNavigate} />
        <GiftSuggestions phase={partnerSharesPhase ? partnerInfo?.phase : undefined} partnerId={partnerId!} pairingId={pairing!.id} partnerName={partnerName} onNavigate={onNavigate} />

        {(editingWeather || !profile?.weather) && (
          <WeatherPicker phase={partnerSharesPhase ? partnerInfo?.phase : undefined} current={profile?.weather} onPick={setWeather} disabled={settingWeather} open={editingWeather} />
        )}
      </PageShell>
    )
  }

  // ── Tracker layout (solo or paired with a supporter) ─────────────────────
  return (
    <PageShell phase={myInfo?.phase}>
      {!isPaired && (
        <button onClick={() => setShowPairing(true)} className="w-full relative z-10">
          <Card className="rounded-3xl border-primary/30 bg-primary/5 shadow-sm">
            <CardContent className="pt-5 pb-4 text-center">
              <p className="text-sm">your person isn't here yet 🥺 send them your code</p>
            </CardContent>
          </Card>
        </button>
      )}

      {myInfo && <Greeting name={profile?.display_name || 'you'} phase={myInfo.phase} />}

      {myInfo && (
        <EraHero name={profile?.display_name || 'you'} weather={profile?.weather} info={myInfo} isSelf onEditWeather={() => setEditingWeather(true)} />
      )}

      {myInfo && <PhaseNote phase={myInfo.phase} perspective="self" delay={80} />}

      {(editingWeather || (myInfo && !profile?.weather)) && (
        <WeatherPicker phase={myInfo?.phase} current={profile?.weather} onPick={setWeather} disabled={settingWeather} open={editingWeather} />
      )}

      {myInfo && <DailyLogCard phase={myInfo.phase} log={myLog} onSave={saveLog} />}
      {isTracker && <PeriodLogCard phase={myInfo?.phase} cycle={cycle} onLog={logPeriod} />}

      {isPaired && partnerIsTracker && partnerSharesPhase && partnerInfo && (
        <EraHero name={partnerName} weather={partnerSharesMood ? partnerProfile?.weather : null} info={partnerInfo} isSelf={false} />
      )}

      {isPaired && partnerId && (
        <GiftSuggestions phase={partnerInfo?.phase || myInfo?.phase} partnerId={partnerId} pairingId={pairing!.id} partnerName={partnerName} onNavigate={onNavigate} />
      )}

      <QuickActions onNavigate={onNavigate} />
    </PageShell>
  )
}

// ── Layout shell with layered background + floating blobs ──────────────────
function PageShell({ phase, children }: { phase: Phase | undefined; children: React.ReactNode }) {
  const accent = phase ? ERAS[phase].accent : ERAS.follicular.accent
  return (
    <div className="era-page min-h-full relative overflow-hidden">
      <div className="era-blob" style={{ background: accent, width: 260, height: 260, top: -60, right: -70 }} />
      <div className="era-blob" style={{ background: accent, width: 200, height: 200, bottom: 40, left: -80, opacity: 0.18 }} />
      <div className="p-4 max-w-lg mx-auto space-y-4 relative z-10">{children}</div>
    </div>
  )
}

function Greeting({ name, phase, supporter, partnerName }: { name: string; phase?: Phase; supporter?: boolean; partnerName?: string }) {
  if (!phase) {
    return <h1 className="text-2xl font-extrabold tracking-tight relative z-10">hey {name} 🤍</h1>
  }
  const era = ERAS[phase]
  return (
    <h1 className="text-2xl font-extrabold tracking-tight leading-snug relative z-10">
      {supporter ? <>{partnerName} is in their </> : <>hey {name}, it's your </>}
      <span className="inline-block rounded-full px-2 py-0.5" style={{ background: era.accentSoft, color: era.accent }}>
        {era.name} {era.emoji}
      </span>
    </h1>
  )
}

// ── Full-width era hero card ───────────────────────────────────────────────
function EraHero({ name, weather, info, isSelf, onEditWeather }: {
  name: string; weather: string | null | undefined; info: ReturnType<typeof getCycleInfo>; isSelf?: boolean; onEditWeather?: () => void
}) {
  const era = ERAS[info.phase]
  return (
    <div className="relative fade-rise z-10">
      {/* Weather chip overlapping the top-right corner */}
      {weather && (
        <button
          onClick={isSelf ? onEditWeather : undefined}
          className={`absolute -top-3 -right-1 z-20 h-12 w-12 rounded-2xl bg-card era-shadow flex items-center justify-center tilt-r ${isSelf ? 'squish' : ''}`}
          title={isSelf ? 'update your vibe' : undefined}
        >
          <span className="text-2xl">{weather}</span>
        </button>
      )}
      <div className="rounded-[26px] era-shadow p-5 relative overflow-hidden" style={{ background: eraGradient(info.phase), color: era.ink }}>
        {/* Floating decorative era icons */}
        {era.icons.map((ic, i) => (
          <span key={i} className="absolute text-3xl select-none pointer-events-none" style={{ opacity: 0.16, top: 12 + i * 34, right: 60 + i * 26, transform: `rotate(${i % 2 ? 8 : -8}deg)` }}>{ic}</span>
        ))}
        <p className="text-sm font-semibold opacity-80">{name}</p>
        <div className="flex items-end gap-3 mt-1">
          <div className="leading-none">
            <span className="text-xs uppercase tracking-wide opacity-70">day</span>
            <p className="text-5xl font-extrabold leading-none">{info.dayOfCycle}</p>
          </div>
          <div className="pb-1">
            <p className="text-lg font-bold">{era.name} {era.emoji}</p>
            <p className="text-xs opacity-80">day {info.dayInPhase} of this arc</p>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.55)' }}>
          period in ~{info.daysUntilNextPeriod}d 📅
        </div>
      </div>
    </div>
  )
}

// ── Compact equal-size hero for dual-tracker ───────────────────────────────
function HeroMini({ name, weather, info, isSelf, onEditWeather, hidden, delay }: {
  name: string; weather: string | null | undefined; info: ReturnType<typeof getCycleInfo> | null; isSelf?: boolean; onEditWeather?: () => void; hidden?: boolean; delay?: number
}) {
  if (hidden || !info) {
    return (
      <div className="rounded-[22px] border border-border/50 bg-card/70 p-4 flex flex-col justify-center items-center text-center min-h-[132px] fade-rise" style={{ animationDelay: `${delay || 0}ms` }}>
        <span className="text-2xl">🤍</span>
        <p className="text-[11px] text-muted-foreground mt-1 truncate max-w-full">{name} is private</p>
      </div>
    )
  }
  const era = ERAS[info.phase]
  return (
    <div className="relative fade-rise" style={{ animationDelay: `${delay || 0}ms` }}>
      {weather && (
        <button
          onClick={isSelf ? onEditWeather : undefined}
          className={`absolute -top-2.5 -right-1 z-20 h-9 w-9 rounded-xl bg-card era-shadow flex items-center justify-center tilt-r-sm ${isSelf ? 'squish' : ''}`}
        >
          <span className="text-lg">{weather}</span>
        </button>
      )}
      <div className="rounded-[22px] era-shadow p-4 h-full relative overflow-hidden" style={{ background: eraGradient(info.phase), color: era.ink }}>
        <p className="text-[11px] font-semibold opacity-80 truncate">{name}</p>
        <p className="text-4xl font-extrabold leading-none mt-1">{info.dayOfCycle}</p>
        <p className="text-[11px] font-bold mt-1">{era.name} {era.emoji}</p>
        <p className="text-[10px] opacity-80 mt-0.5">~{info.daysUntilNextPeriod}d to period</p>
      </div>
    </div>
  )
}

// ── "why i might feel this way" — sticky note (phase education) ─────────────
function PhaseNote({ phase, perspective, name, delay }: { phase: Phase; perspective: 'self' | 'partner'; name?: string; delay?: number }) {
  const era = ERAS[phase]
  const info = PHASE_INFO[phase]
  const who = perspective === 'self' ? 'you' : (name || 'they')
  const feelLabel = perspective === 'self' ? 'why you might feel this way' : `how ${who} might feel`
  return (
    <div className="sticky-note tilt-l-sm p-4 fade-rise relative z-10" style={{ background: era.accentSoft, animationDelay: `${delay || 0}ms` }}>
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: era.accent }}>{feelLabel}</p>
      <p className="text-sm mt-1.5 leading-relaxed">{info.whatItIs}</p>
      <p className="text-sm mt-2 leading-relaxed font-medium">{info.howTheyFeel}</p>
      {perspective === 'partner' && (
        <p className="text-sm mt-2 leading-relaxed">💡 {info.forPartner}</p>
      )}
      {perspective === 'self' && (
        <p className="text-xs mt-2 opacity-70">{SELF_PHASE_LINES[phase]}</p>
      )}
    </div>
  )
}

function OverlapInsight({ myPhase, partnerPhase, myName, partnerName }: { myPhase: string; partnerPhase: string; myName: string; partnerName: string }) {
  let line = ''
  const bothLow = (myPhase === 'luteal' || myPhase === 'menstrual') && (partnerPhase === 'luteal' || partnerPhase === 'menstrual')
  const bothHigh = (myPhase === 'follicular' || myPhase === 'ovulatory') && (partnerPhase === 'follicular' || partnerPhase === 'ovulatory')

  if (bothLow) {
    line = "you're BOTH in your fragile era 🌧️🌧️ be gentle. order the food. hug it out."
  } else if (bothHigh) {
    line = "double glow era ✨✨ go be insufferable together"
  } else {
    const myHigh = myPhase === 'follicular' || myPhase === 'ovulatory'
    if (myHigh) {
      line = `${myName}'s thriving, ${partnerName}'s in survival mode — ${myName}, you're on soup duty ☀️🌧️`
    } else {
      line = `${partnerName}'s thriving, ${myName}'s in survival mode — ${partnerName}, you're on soup duty ☀️🌧️`
    }
  }

  if (!line) return null

  return (
    <Card className="rounded-3xl border-border/50 bg-muted/50 shadow-sm relative z-10">
      <CardContent className="pt-5 pb-4">
        <p className="text-sm">{line}</p>
      </CardContent>
    </Card>
  )
}

function WeatherPicker({ phase, current, onPick, disabled, open }: { phase?: Phase; current: string | null | undefined; onPick: (e: string) => void; disabled: boolean; open?: boolean }) {
  if (current && !open) return null
  const era = phase ? ERAS[phase] : null
  return (
    <Card className="rounded-3xl border-border/50 shadow-sm relative z-10">
      <CardContent className="pt-6 text-center space-y-3">
        <p className="text-sm font-medium">{current ? 'update the vibe?' : "what's the vibe today?"}</p>
        <div className="flex justify-center gap-2">
          {WEATHER_OPTIONS.map((w, i) => (
            <button
              key={w.icon}
              onClick={() => onPick(w.icon)}
              disabled={disabled}
              className={`squish flex flex-col items-center gap-1 p-2 rounded-2xl transition-colors ${i % 2 ? 'tilt-r-sm' : 'tilt-l-sm'}`}
              style={{ background: era ? era.accentSoft : undefined }}
            >
              <span className="text-2xl">{w.icon}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{w.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Daily log: flow, symptoms, note (writes to cycle_logs) ─────────────────
function DailyLogCard({ phase, log, onSave }: { phase?: Phase; log: DailyLog | null; onSave: (flow: string | null, symptoms: string[], note: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [flow, setFlow] = useState<string | null>(log?.flow ?? null)
  const [symptoms, setSymptoms] = useState<string[]>(log?.symptoms ?? [])
  const [note, setNote] = useState(log?.note ?? '')
  const [saving, setSaving] = useState(false)
  const era = phase ? ERAS[phase] : null

  useEffect(() => {
    setFlow(log?.flow ?? null)
    setSymptoms(log?.symptoms ?? [])
    setNote(log?.note ?? '')
  }, [log])

  function toggleSymptom(key: string) {
    setSymptoms(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])
  }

  async function save() {
    setSaving(true)
    await onSave(flow, symptoms, note)
    setSaving(false)
    setOpen(false)
  }

  const hasLog = log && (log.flow || (log.symptoms && log.symptoms.length) || log.note)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full text-left relative z-10">
        <Card className="rounded-3xl border-border/50 shadow-sm squish">
          <CardContent className="py-4 px-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">how's today going?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasLog ? 'logged — tap to update' : 'log your flow, symptoms & notes'}
              </p>
            </div>
            <span className="text-xl">📝</span>
          </CardContent>
        </Card>
      </button>
    )
  }

  return (
    <Card className="rounded-3xl border-border/50 shadow-sm relative z-10">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">today's log</p>
          <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground">close</button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">flow</p>
          <div className="flex gap-2">
            {FLOW_OPTIONS.map(f => (
              <button
                key={f.key}
                onClick={() => setFlow(flow === f.key ? null : f.key)}
                className="squish flex-1 rounded-2xl py-2 text-xs font-medium border transition-colors"
                style={flow === f.key ? { background: era?.accent, color: '#fff', borderColor: era?.accent } : { borderColor: 'var(--border)' }}
              >
                <span className="block text-base leading-none mb-0.5">{f.emoji}</span>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">symptoms</p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => toggleSymptom(s.key)}
                className="squish rounded-full px-3 py-1.5 text-xs border transition-colors"
                style={symptoms.includes(s.key) ? { background: era?.accentSoft, color: era?.accent, borderColor: era?.accent } : { borderColor: 'var(--border)' }}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">note (optional)</p>
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="anything worth remembering..." className="rounded-full" maxLength={200} />
        </div>

        <Button onClick={save} disabled={saving} className="w-full rounded-full">
          {saving ? 'saving...' : 'save today'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Period re-log calendar (always available for trackers) ─────────────────
function PeriodLogCard({ phase, cycle, onLog }: { phase?: Phase; cycle: CycleData | null; onLog: (dateStr: string, cycleLen: number, periodLen: number) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Date | undefined>(cycle ? new Date(cycle.last_period_start + 'T00:00:00') : new Date())
  const [cycleLen, setCycleLen] = useState(String(cycle?.avg_cycle_length ?? 28))
  const [periodLen, setPeriodLen] = useState(String(cycle?.avg_period_length ?? 5))
  const [saving, setSaving] = useState(false)
  const era = phase ? ERAS[phase] : null

  useEffect(() => {
    if (cycle) {
      setSelected(new Date(cycle.last_period_start + 'T00:00:00'))
      setCycleLen(String(cycle.avg_cycle_length))
      setPeriodLen(String(cycle.avg_period_length))
    }
  }, [cycle])

  async function save() {
    if (!selected) return
    const d = selected
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setSaving(true)
    await onLog(dateStr, parseInt(cycleLen) || 28, parseInt(periodLen) || 5)
    setSaving(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full text-left relative z-10">
        <Card className="rounded-3xl border-border/50 shadow-sm squish">
          <CardContent className="py-4 px-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5" style={{ color: era?.accent }} />
              <div>
                <p className="text-sm font-semibold">period started early or late?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cycle ? `last logged ${new Date(cycle.last_period_start + 'T00:00:00').toLocaleDateString()}` : 'set your period start'}
                </p>
              </div>
            </div>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </button>
    )
  }

  return (
    <Card className="rounded-3xl border-border/50 shadow-sm relative z-10">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">lock in your period start</p>
          <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground">close</button>
        </div>
        <div className="flex justify-center rounded-2xl border border-border/50">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            disabled={{ after: new Date() }}
            className="rounded-2xl"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cycle-len" className="text-xs">cycle length (days)</Label>
            <Input id="cycle-len" type="number" min={21} max={45} value={cycleLen} onChange={e => setCycleLen(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="period-len" className="text-xs">period length (days)</Label>
            <Input id="period-len" type="number" min={2} max={10} value={periodLen} onChange={e => setPeriodLen(e.target.value)} className="rounded-xl" />
          </div>
        </div>
        <Button onClick={save} disabled={saving || !selected} className="w-full rounded-full">
          {saving ? 'saving...' : 'update my dates'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Partner's shared daily log ─────────────────────────────────────────────
function PartnerTodayCard({ name, log, phase }: { name: string; log: DailyLog; phase?: Phase }) {
  const era = phase ? ERAS[phase] : null
  const flowLabel = FLOW_OPTIONS.find(f => f.key === log.flow)
  const symptoms = (log.symptoms || []).map(k => SYMPTOM_OPTIONS.find(s => s.key === k)).filter(Boolean) as { emoji: string; label: string }[]
  if (!log.flow && symptoms.length === 0 && !log.note) return null
  return (
    <Card className="rounded-3xl border-border/50 shadow-sm relative z-10" style={{ background: era?.accentSoft }}>
      <CardContent className="pt-5 pb-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: era?.accent }}>{name} logged today</p>
        {flowLabel && flowLabel.key !== 'none' && <p className="text-sm">flow: {flowLabel.emoji} {flowLabel.label}</p>}
        {symptoms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {symptoms.map(s => (
              <span key={s.label} className="rounded-full bg-card/70 px-2.5 py-1 text-xs">{s.emoji} {s.label}</span>
            ))}
          </div>
        )}
        {log.note && <p className="text-sm italic text-muted-foreground">"{log.note}"</p>}
      </CardContent>
    </Card>
  )
}

function QuickActions({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="flex gap-2 relative z-10">
      <Button variant="outline" className="flex-1 rounded-full text-xs h-auto py-3 bg-card" onClick={() => onNavigate('notify')}>
        send them something cute 💌
      </Button>
      <Button variant="outline" className="flex-1 rounded-full text-xs h-auto py-3 bg-card" onClick={() => onNavigate('chat')}>
        go yap 💬
      </Button>
    </div>
  )
}

function GiftSuggestions({ phase, partnerId, pairingId, partnerName, onNavigate }: {
  phase: string | undefined; partnerId: string; pairingId: string; partnerName: string; onNavigate: (s: Screen) => void
}) {
  const { user } = useSession()
  const [sending, setSending] = useState(false)
  const picks = phase ? PHASE_GIFT_PICKS[phase] : PHASE_GIFT_PICKS['luteal']
  if (!picks) return null
  const top2 = picks.slice(0, 2)
  const era = phase ? ERAS[phase as Phase] : null

  async function quickSend(gift: typeof top2[0]) {
    if (!user) return
    setSending(true)
    const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
    const currentBalance = wallet?.balance ?? 500
    if (currentBalance < gift.cost) {
      toast("not enough credits — but it's the thought that counts 💸")
      setSending(false)
      return
    }
    if (!wallet) {
      await supabase.from('wallets').insert({ balance: 500 - gift.cost })
    } else {
      await supabase.from('wallets').update({ balance: currentBalance - gift.cost, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    }
    await supabase.from('gifts').insert({
      recipient_id: partnerId,
      pairing_id: pairingId,
      name: gift.name,
      emoji: gift.emoji,
      cost: gift.cost,
      phase_context: phase || null,
    })
    toast(`${gift.emoji} ${gift.name} sent to ${partnerName} — you're the best 💌`)
    setSending(false)
  }

  return (
    <div className="relative z-10 space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-muted-foreground">gift idea for {partnerName}</p>
        <button onClick={() => onNavigate('gifts')} className="text-xs font-medium" style={{ color: era?.accent }}>more</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {top2.map((gift, i) => (
          <button
            key={gift.name}
            onClick={() => quickSend(gift)}
            disabled={sending}
            className={`squish shrink-0 w-44 rounded-3xl p-4 text-left era-shadow disabled:opacity-50 ${i % 2 ? 'tilt-r-sm' : 'tilt-l-sm'}`}
            style={{ background: era ? era.accentSoft : 'var(--muted)' }}
          >
            <span className="text-3xl block">{gift.emoji}</span>
            <p className="text-sm font-semibold mt-2">{gift.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{gift.reason}</p>
            <p className="text-[11px] font-bold mt-2" style={{ color: era?.accent }}>{gift.cost} credits →</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function SupporterActions({ phase, onNavigate }: { phase: string | undefined; onNavigate: (s: Screen) => void }) {
  const isLowEnergy = phase === 'luteal' || phase === 'menstrual'
  const era = phase ? ERAS[phase as Phase] : null
  const actions = [
    { emoji: '💌', label: 'send something cute', onClick: () => onNavigate('notify') },
    { emoji: '🍜', label: 'deploy emergency snacks', onClick: () => window.open('https://www.doordash.com/search/', '_blank') },
    isLowEnergy
      ? { emoji: '🛋️', label: 'plan a couch date', onClick: () => onNavigate('chat') }
      : { emoji: '✨', label: 'plan a real date', onClick: () => onNavigate('chat') },
  ]
  return (
    <div className="relative z-10 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground px-1">what you can do</p>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {actions.map((a, i) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`squish shrink-0 w-36 rounded-3xl p-4 text-left era-shadow ${i % 2 ? 'tilt-r-sm' : 'tilt-l-sm'}`}
            style={{ background: era ? era.accentSoft : 'var(--muted)' }}
          >
            <span className="text-3xl block">{a.emoji}</span>
            <p className="text-xs font-semibold mt-2 leading-tight">{a.label}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
