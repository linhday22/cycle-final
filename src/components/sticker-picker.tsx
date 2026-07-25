import { useEffect, useState } from 'react'
import { useSession } from '@/components/session-provider'
import { supabase } from '@/lib/supabase'
import { X, Trash2 } from 'lucide-react'

interface Sticker {
  id: string
  name: string
  image_data: string
  emoji: string | null
}

interface StickerPickerProps {
  onSelect: (imageData: string) => void
  onClose: () => void
}

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const { user } = useSession()
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStickers()
  }, [])

  async function loadStickers() {
    if (!user) return
    const { data } = await supabase
      .from('stickers')
      .select('id, name, image_data, emoji')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setStickers(data)
    setLoading(false)
  }

  async function deleteSticker(id: string) {
    await supabase.from('stickers').delete().eq('id', id)
    setStickers(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="border-t border-border/50 bg-card p-4 space-y-3 max-h-[50vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">your custom stickers</p>
        <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
      </div>

      {loading && <p className="text-xs text-muted-foreground text-center py-4">loading...</p>}

      {!loading && stickers.length === 0 && (
        <div className="text-center py-6 space-y-2">
          <p className="text-3xl">🎨</p>
          <p className="text-xs text-muted-foreground">no stickers yet — draw one and save it!</p>
          <p className="text-xs text-muted-foreground">use the draw tool to create custom stickers</p>
        </div>
      )}

      {stickers.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {stickers.map(sticker => (
            <div key={sticker.id} className="relative group">
              <button
                onClick={() => onSelect(sticker.image_data)}
                className="w-full aspect-square rounded-xl border border-border/50 overflow-hidden hover:ring-2 hover:ring-primary transition-all bg-white"
              >
                <img src={sticker.image_data} alt={sticker.name} className="w-full h-full object-contain p-1" />
              </button>
              <button
                onClick={() => deleteSticker(sticker.id)}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <p className="text-[10px] text-center text-muted-foreground mt-0.5 truncate">{sticker.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
