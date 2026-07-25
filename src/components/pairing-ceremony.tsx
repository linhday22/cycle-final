import { useEffect, useState } from 'react'

export function PairingCeremony({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'slide' | 'confetti' | 'done'>('slide')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('confetti'), 1200)
    const t2 = setTimeout(() => setPhase('done'), 3000)
    const t3 = setTimeout(onDone, 4500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className={`w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl transition-transform duration-1000 ${phase === 'slide' ? 'translate-x-4' : 'translate-x-2'}`}>
            <span>🧑</span>
          </div>
          <div className={`w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl transition-transform duration-1000 ${phase === 'slide' ? '-translate-x-4' : '-translate-x-2'}`}>
            <span>🧑</span>
          </div>
        </div>

        {phase === 'confetti' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <span
                key={i}
                className="absolute animate-bounce text-lg"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 60}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.8 + Math.random() * 0.6}s`,
                }}
              >
                {['💞', '✨', '🎉', '💕', '🌸'][i % 5]}
              </span>
            ))}
          </div>
        )}

        <div className={`transition-opacity duration-500 ${phase !== 'slide' ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-2xl font-bold">you two are synced 💞</p>
          <p className="text-muted-foreground mt-2">you're connected — time to take care of each other</p>
        </div>
      </div>
    </div>
  )
}
