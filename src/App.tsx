import { useState } from 'react'
import { useSession, SessionProvider } from '@/components/session-provider'
import { AuthScreen } from '@/components/auth-screen'
import { OnboardingScreen } from '@/components/onboarding-screen'
import { DashboardScreen } from '@/components/dashboard-screen'
import { ChatScreen } from '@/components/chat-screen'
import { NudgeScreen } from '@/components/nudge-screen'
import { SettingsScreen } from '@/components/settings-screen'
import { Spinner } from '@/components/ui/spinner'
import { Toaster } from '@/components/ui/sonner'
import { GiftScreen } from '@/components/gift-screen'
import { NotificationListener } from '@/components/notification-listener'
import { Home, MessageCircle, Bell, Gift, Settings } from 'lucide-react'

type Screen = 'home' | 'chat' | 'notify' | 'gifts' | 'settings'

function AppContent() {
  const { user, loading, profile } = useSession()
  const [screen, setScreen] = useState<Screen>('home')

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) return <AuthScreen />
  if (!profile?.onboarding_complete) return <OnboardingScreen />

  const navItems: { id: Screen; icon: React.ReactNode; label: string }[] = [
    { id: 'home', icon: <Home className="h-5 w-5" />, label: 'Home' },
    { id: 'chat', icon: <MessageCircle className="h-5 w-5" />, label: 'Chat' },
    { id: 'notify', icon: <Bell className="h-5 w-5" />, label: 'Notify' },
    { id: 'gifts', icon: <Gift className="h-5 w-5" />, label: 'Gifts' },
    { id: 'settings', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
  ]

  return (
    <div className="flex flex-col min-h-svh">
      <NotificationListener screen={screen} onNavigate={setScreen} />
      <main className="flex-1 overflow-y-auto pb-16">
        {screen === 'home' && <DashboardScreen onNavigate={setScreen} />}
        {screen === 'chat' && <ChatScreen />}
        {screen === 'notify' && <NudgeScreen />}
        {screen === 'gifts' && <GiftScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-card/95 backdrop-blur-sm z-40">
        <div className="flex max-w-lg mx-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                screen === item.id
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export function App() {
  return (
    <SessionProvider>
      <AppContent />
      <Toaster />
    </SessionProvider>
  )
}

export default App
