import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eraser, Undo2, Type, Pen, X } from 'lucide-react'

interface DrawingCanvasProps {
  onSend: (dataUrl: string) => void
  onSaveSticker: (dataUrl: string) => void
  onClose: () => void
}

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
]

const BRUSH_SIZES = [3, 6, 12, 20]

export function DrawingCanvas({ onSend, onSaveSticker, onClose }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(6)
  const [tool, setTool] = useState<'pen' | 'eraser' | 'text'>('pen')
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)
  const [history, setHistory] = useState<ImageData[]>([])
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveToHistory()
  }, [])

  function saveToHistory() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setHistory(prev => [...prev.slice(-20), ctx.getImageData(0, 0, canvas.width, canvas.height)])
  }

  function undo() {
    if (history.length <= 1) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const prev = history[history.length - 2]
    ctx.putImageData(prev, 0, 0)
    setHistory(h => h.slice(0, -1))
  }

  function getPos(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.TouchEvent | React.MouseEvent) {
    if (tool === 'text') {
      const pos = getPos(e)
      setTextPos(pos)
      setShowTextInput(true)
      return
    }
    setIsDrawing(true)
    lastPosRef.current = getPos(e)
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    const last = lastPosRef.current || pos

    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPosRef.current = pos
  }

  function endDraw() {
    if (isDrawing) {
      setIsDrawing(false)
      lastPosRef.current = null
      saveToHistory()
    }
  }

  function addText() {
    if (!textInput.trim() || !textPos) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.font = 'bold 24px system-ui, sans-serif'
    ctx.fillStyle = color
    ctx.fillText(textInput, textPos.x, textPos.y)
    setTextInput('')
    setShowTextInput(false)
    setTextPos(null)
    setTool('pen')
    saveToHistory()
  }

  function getDataUrl() {
    return canvasRef.current?.toDataURL('image/png') || ''
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <button onClick={onClose}><X className="h-5 w-5" /></button>
        <span className="text-sm font-medium">draw something</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-full text-xs h-7" onClick={() => onSaveSticker(getDataUrl())}>
            save sticker
          </Button>
          <Button size="sm" className="rounded-full text-xs h-7" onClick={() => onSend(getDataUrl())}>
            send
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 p-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          className="bg-white rounded-xl shadow-sm max-w-full max-h-full touch-none"
          style={{ aspectRatio: '1' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      {/* Text input overlay */}
      {showTextInput && (
        <div className="absolute bottom-32 left-4 right-4 flex gap-2 z-10">
          <Input
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="type your text..."
            className="rounded-full flex-1"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') addText() }}
          />
          <Button onClick={addText} size="sm" className="rounded-full">add</Button>
          <Button onClick={() => { setShowTextInput(false); setTool('pen') }} size="sm" variant="ghost" className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="border-t border-border/50 p-3 space-y-3">
        {/* Tools */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setTool('pen')}
            className={`p-2.5 rounded-xl transition-colors ${tool === 'pen' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            <Pen className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2.5 rounded-xl transition-colors ${tool === 'eraser' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            <Eraser className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-2.5 rounded-xl transition-colors ${tool === 'text' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            <Type className="h-4 w-4" />
          </button>
          <button onClick={undo} className="p-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
            <Undo2 className="h-4 w-4" />
          </button>
          <div className="h-6 w-px bg-border mx-1" />
          {BRUSH_SIZES.map(size => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              className={`flex items-center justify-center h-8 w-8 rounded-xl transition-colors ${brushSize === size ? 'bg-muted ring-2 ring-primary' : 'hover:bg-muted/50'}`}
            >
              <div className="rounded-full bg-foreground" style={{ width: size, height: size }} />
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center justify-center gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-primary' : 'border-border/50'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
