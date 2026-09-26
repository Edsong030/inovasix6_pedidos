'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Loader2, Tag, Package, ImageOff, Upload, Link as LinkIcon, X,
} from 'lucide-react'
import { dataApi } from '@/hooks/useApi'
import { IS_DEMO } from '@/lib/demo'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, cn } from '@/lib/utils'
import type { Category, Product } from '@/types'
import toast from 'react-hot-toast'

// ─── Placeholder de fallback ──────────────────────────────────────────────────
function MediaPlaceholder({ name, className }: { name: string; className?: string }) {
  const colors = ['from-brand-700 to-brand-900','from-purple-700 to-purple-900','from-emerald-700 to-emerald-900','from-amber-700 to-amber-900','from-rose-700 to-rose-900','from-sky-700 to-sky-900']
  const idx = name.charCodeAt(0) % colors.length
  return (
    <div className={cn(`bg-gradient-to-br ${colors[idx]} flex flex-col items-center justify-center gap-1`, className)}>
      <ImageOff size={20} className="text-white/40" />
      <span className="text-white/60 text-xs text-center px-2 line-clamp-2 leading-tight">{name}</span>
    </div>
  )
}

/**
 * ProductMediaCard — exibe imageUrl como capa e, se houver videoUrl,
 * carrega o vídeo apenas quando o elemento entrar no viewport (IntersectionObserver)
 * ou quando o usuário fizer hover. Nunca reproduz 22 vídeos ao mesmo tempo.
 *
 * Regras:
 *  - preload="metadata" → só baixa cabeçalho do vídeo até ser visível
 *  - muted + loop + playsInline → vídeo silencioso e em loop
 *  - Se videoUrl falhar → cai para imageUrl
 *  - Se imageUrl falhar → cai para placeholder degradê
 */
function ProductMediaCard({ imageUrl, videoUrl, name, className }: {
  imageUrl?: string | null
  videoUrl?: string | null
  name:      string
  className?: string
}) {
  const [imgErr,   setImgErr]   = useState(false)
  const [vidErr,   setVidErr]   = useState(false)
  const [visible,  setVisible]  = useState(false)
  const [hovered,  setHovered]  = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)

  // Reset de erros quando URLs mudam
  const prevImg = useRef(imageUrl)
  const prevVid = useRef(videoUrl)
  if (prevImg.current !== imageUrl) { prevImg.current = imageUrl; setImgErr(false) }
  if (prevVid.current !== videoUrl) { prevVid.current = videoUrl; setVidErr(false) }

  // IntersectionObserver — ativa quando 10% do card estiver visível
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Play/pause controlado por visibilidade + hover
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    if (visible && hovered) {
      vid.play().catch(() => {/* autoplay blocked — ok, imagem fica visível */})
    } else {
      vid.pause()
      vid.currentTime = 0
    }
  }, [visible, hovered])

  const showVideo = !!videoUrl && !vidErr
  const showImage = !!imageUrl && !imgErr
  const showPlaceholder = !showVideo && !showImage

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Placeholder — sempre renderizado como base */}
      {showPlaceholder && <MediaPlaceholder name={name} className="w-full h-full" />}

      {/* Imagem — capa e fallback do vídeo */}
      {!showPlaceholder && showImage && (
        <img
          src={imageUrl!}
          alt={name}
          className={cn(
            'w-full h-full object-cover absolute inset-0 transition-opacity duration-300',
            // Esconde imagem quando vídeo está tocando (hover + visible)
            showVideo && hovered && visible ? 'opacity-0' : 'opacity-100',
          )}
          onError={() => setImgErr(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}

      {/* Vídeo — lazy: só renderizado quando visível no viewport */}
      {showVideo && visible && (
        <video
          ref={videoRef}
          className={cn(
            'w-full h-full object-cover absolute inset-0 transition-opacity duration-300',
            hovered ? 'opacity-100' : 'opacity-0',
          )}
          src={videoUrl!}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVidErr(true)}
          // Não usar autoPlay — controlado por JS
        />
      )}

      {/* Indicador de vídeo disponível */}
      {showVideo && !hovered && (
        <div className="absolute bottom-1.5 right-1.5 bg-black/50 rounded-full p-0.5" title="Tem video — passe o mouse para ver">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="white" aria-hidden="true">
            <polygon points="3,2 10,6 3,10" />
          </svg>
        </div>
      )}
    </div>
  )
}

// ─── Seletor de imagem ────────────────────────────────────────────────────────
function ImagePicker({ value, onChange, suggestedUrl }: { value: string; onChange: (url: string) => void; suggestedUrl?: string }) {
  const [mode,      setMode]      = useState<'url' | 'upload'>('url')
  const [preview,   setPreview]   = useState(value)
  const [imgError,  setImgError]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setPreview(value); setImgError(false) }, [value])

  const handleUrlChange = (url: string) => { onChange(url); setPreview(url); setImgError(false) }

  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const ALLOWED_EXTS  = ['.jpg', '.jpeg', '.png', '.webp']
  const MAX_BYTES     = 5 * 1024 * 1024

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTS.includes(ext)) {
      toast.error(`Formato nao permitido: ${ext}. Use JPG, JPEG, PNG ou WEBP.`)
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error(`Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximo: 5 MB.`)
      return
    }

    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setImgError(false)
    setUploading(true)
    setUploadPct(10)

    try {
      const { dataApi: dApi } = await import('@/hooks/useApi')
      setUploadPct(40)
      const url = await dApi.uploadProductImage(file)
      setUploadPct(100)
      onChange(url)
      setPreview(url)
      URL.revokeObjectURL(localUrl)
      toast.success('Imagem enviada com sucesso!')
    } catch (err: unknown) {
      const msg = (err as Error).message
      if (msg === 'DEMO_MODE') {
        toast.error('Upload nao disponivel no modo demo.')
      } else {
        toast.error(msg || 'Erro ao enviar imagem')
      }
      setPreview(value)
    } finally {
      setUploading(false)
      setUploadPct(0)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !fileRef.current) return
    const dt = new DataTransfer()
    dt.items.add(file)
    fileRef.current.files = dt.files
    fileRef.current.dispatchEvent(new Event('change', { bubbles: true }))
  }

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="w-full h-36 rounded-xl overflow-hidden bg-surface-50 border border-card-border relative">
        {preview && !imgError ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-600">
            <ImageOff size={28} />
            <span className="text-xs">{preview && imgError ? 'URL invalida' : 'Sem imagem'}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="text-white animate-spin" />
            <div className="w-3/4 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-brand-400 rounded-full transition-all duration-300" style={{ width: `${uploadPct}%` }} />
            </div>
            <span className="text-white text-xs">Enviando...</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-50 p-0.5 rounded-lg">
        <button type="button" onClick={() => setMode('url')}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all', mode === 'url' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white')}>
          <LinkIcon size={12} /> URL externa
        </button>
        <button type="button" onClick={() => setMode('upload')}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all', mode === 'upload' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white')}>
          <Upload size={12} /> Upload local
        </button>
      </div>

      {/* Conteudo */}
      {mode === 'url' ? (
        <div className="space-y-2">
          <input value={value} onChange={e => handleUrlChange(e.target.value)} className="input text-sm" placeholder="https://images.unsplash.com/..." />
          {suggestedUrl && value !== suggestedUrl && (
            <button type="button" onClick={() => handleUrlChange(suggestedUrl)} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Usar imagem sugerida
            </button>
          )}
          {value && (
            <button type="button" onClick={() => handleUrlChange('')} className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1">
              <X size={12} /> Remover imagem
            </button>
          )}
        </div>
      ) : IS_DEMO ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
          <span className="text-amber-400 mt-0.5 flex-shrink-0">aviso</span>
          <span>Upload local nao disponivel no modo demo (GitHub Pages). Use uma URL externa.</span>
        </div>
      ) : (
        <div className="space-y-2">
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => !uploading && fileRef.current?.click()}
            className={cn('w-full flex flex-col items-center justify-center gap-2 py-4 border-2 border-dashed rounded-xl text-sm transition-all cursor-pointer',
              uploading ? 'border-brand-500 text-brand-400 cursor-not-allowed' : 'border-card-border text-gray-400 hover:text-white hover:border-brand-500')}
          >
            {uploading ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Upload size={18} /> Clique ou arraste uma imagem aqui</>}
          </div>
          <p className="text-xs text-gray-600 text-center">JPG, JPEG, PNG, WEBP - max. 5 MB</p>
          {value && (
            <button type="button" onClick={() => handleUrlChange('')} className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1">
              <X size={12} /> Remover imagem
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Formulario de categoria ──────────────────────────────────────────────────
function CategoryForm({ initial, onSave, onCancel }: { initial?: Partial<Category>; onSave: (data: Partial<Category>) => Promise<void>; onCancel: () => void }) {
  const [name,   setName]   = useState(initial?.name || '')
  const [desc,   setDesc]   = useState(initial?.description || '')
  const [order,  setOrder]  = useState(String(initial?.sortOrder ?? 0))
  const [active, setActive] = useState(initial?.active ?? true)
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    if (!name.trim()) { toast.error('Nome e obrigatorio'); return }
    setSaving(true)
    try { await onSave({ name: name.trim(), description: desc.trim() || undefined, sortOrder: parseInt(order) || 0, active }) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome *</label>
        <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Ex: Pizzas, Bebidas..." autoFocus />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Descricao</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} className="input" placeholder="Descricao opcional" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Ordem</label>
          <input type="number" min={0} value={order} onChange={e => setOrder(e.target.value)} className="input" />
        </div>
        <div className="flex flex-col justify-end pb-1">
          <button type="button" onClick={() => setActive(!active)} className="flex items-center gap-2 text-sm text-gray-300">
            {active ? <ToggleRight size={22} className="text-brand-400" /> : <ToggleLeft size={22} className="text-gray-600" />}
            {active ? 'Ativa' : 'Inativa'}
          </button>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancelar</button>
        <button onClick={handle} disabled={!name.trim() || saving} className="btn-primary flex-1 justify-center">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {initial?.id ? 'Salvar alteracoes' : 'Criar categoria'}
        </button>
      </div>
    </div>
  )
}

// ─── URLs sugeridas por produto ───────────────────────────────────────────────
const SUGGESTED_IMAGES: Record<string, string> = {
  'Bruschetta de Tomate':      'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&q=80',
  'Bolinho de Bacalhau (8 un)':'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80',
  'Tabua de Frios':            'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=400&q=80',
  'File ao Molho Madeira':     'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
  'Frango Grelhado':           'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&q=80',
  'Moqueca de Camarao':        'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
  'Risoto de Funghi':          'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80',
  'Margherita':                'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80',
  'Calabresa':                 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80',
  'Frango com Catupiry':       'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80',
  'Quatro Queijos':            'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&q=80',
  'Classic Burger':            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'Smash Bacon':               'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&q=80',
  'Veggie Burger':             'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&q=80',
  'Coca-Cola Lata':            'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
  'Suco de Laranja Natural':   'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80',
  'Agua Mineral':              'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80',
  'Cerveja Artesanal IPA':     'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=80',
  'Cerveja Pilsen':            'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&q=80',
  'Petit Gateau':              'https://images.unsplash.com/photo-1611329532992-0b7af95a3b14?w=400&q=80',
  'Pudim de Leite':            'https://images.unsplash.com/photo-1515467837915-15c4777cd6f0?w=400&q=80',
  'Cheesecake de Morango':     'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&q=80',
}

// ─── VideoPicker — URL externa ou upload local de video ──────────────────────
function VideoPicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [mode,      setMode]      = useState<'url' | 'upload'>('url')
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [vidError,  setVidError]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Reset erro quando URL muda
  const prevVal = useRef(value)
  if (prevVal.current !== value) { prevVal.current = value; setVidError(false) }

  const VID_TYPES = ['video/mp4', 'video/webm']
  const VID_EXTS  = ['.mp4', '.webm']
  const VID_MAX   = 15 * 1024 * 1024 // 15 MB

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return

    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
    if (!VID_TYPES.includes(file.type) && !VID_EXTS.includes(ext)) {
      toast.error(`Formato nao permitido: ${ext}. Use .mp4 ou .webm.`)
      return
    }
    if (file.size > VID_MAX) {
      toast.error(`Video muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximo: 15 MB.`)
      return
    }

    setUploading(true)
    setUploadPct(15)
    try {
      const { dataApi: dApi } = await import('@/hooks/useApi')
      setUploadPct(45)
      const url = await dApi.uploadProductVideo(file)
      setUploadPct(100)
      onChange(url)
      toast.success('Video enviado com sucesso!')
    } catch (err: unknown) {
      const msg = (err as Error).message
      toast.error(msg === 'DEMO_MODE' ? 'Upload nao disponivel no modo demo.' : (msg || 'Erro ao enviar video'))
    } finally {
      setUploading(false)
      setUploadPct(0)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !fileRef.current) return
    const dt = new DataTransfer(); dt.items.add(file)
    fileRef.current.files = dt.files
    fileRef.current.dispatchEvent(new Event('change', { bubbles: true }))
  }

  return (
    <div className="space-y-2">
      {/* Tabs URL / Upload */}
      <div className="flex gap-1 bg-surface-50 p-0.5 rounded-lg">
        <button type="button" onClick={() => setMode('url')}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all',
            mode === 'url' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white')}>
          <LinkIcon size={12} /> URL externa
        </button>
        <button type="button" onClick={() => setMode('upload')}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all',
            mode === 'upload' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white')}>
          <Upload size={12} /> Upload local
        </button>
      </div>

      {/* URL externa */}
      {mode === 'url' && (
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setVidError(false) }}
          className="input text-sm"
          placeholder="https://... (.mp4 ou .webm)"
        />
      )}

      {/* Upload local — demo bloqueado */}
      {mode === 'upload' && IS_DEMO && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5">&#9888;</span>
          <span>Upload local nao disponivel no modo demo. Use uma URL externa.</span>
        </div>
      )}

      {/* Upload local — real */}
      {mode === 'upload' && !IS_DEMO && (
        <>
          <input ref={fileRef} type="file" accept=".mp4,.webm,video/mp4,video/webm" onChange={handleFile} className="hidden" />
          <div
            onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            onClick={() => !uploading && fileRef.current?.click()}
            className={cn('w-full flex flex-col items-center justify-center gap-2 py-4 border-2 border-dashed rounded-xl text-sm transition-all cursor-pointer',
              uploading ? 'border-brand-500 text-brand-400 cursor-not-allowed' : 'border-card-border text-gray-400 hover:text-white hover:border-brand-500')}
          >
            {uploading
              ? <><Loader2 size={18} className="animate-spin" /> Enviando... {uploadPct}%</>
              : <><Upload size={18} /> Clique ou arraste .mp4 / .webm</>}
          </div>
          {uploading && (
            <div className="h-1.5 bg-surface-50 rounded-full overflow-hidden">
              <div className="h-full bg-brand-400 transition-all duration-300" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
          <p className="text-xs text-gray-600 text-center">MP4 ou WEBM · max. 15 MB</p>
        </>
      )}

      {/* Preview + remover */}
      {value && (
        <div className="flex items-start gap-3 p-2 bg-surface-50 rounded-xl border border-card-border">
          <video
            src={value}
            className="w-28 h-16 rounded-lg object-cover bg-black flex-shrink-0"
            muted preload="metadata"
            onError={() => setVidError(true)}
          />
          <div className="flex-1 min-w-0 text-xs text-gray-500 space-y-1">
            {vidError
              ? <p className="text-amber-400">Video inacessivel — verifique a URL</p>
              : <p className="text-emerald-400">Preview ok</p>}
            <p className="truncate text-gray-600">{value}</p>
            <button type="button" onClick={() => { onChange(''); setVidError(false) }}
              className="text-red-400 hover:text-red-300 flex items-center gap-1">
              <X size={11} /> Remover video
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600">
        Video reproduzido em silencio no hover do card. A imagem e a capa e o fallback.
      </p>
    </div>
  )
}

// ─── Formulario de produto ────────────────────────────────────────────────────
function ProductForm({ initial, categories, onSave, onCancel }: { initial?: Partial<Product>; categories: Category[]; onSave: (data: Partial<Product>) => Promise<void>; onCancel: () => void }) {
  const [name,      setName]      = useState(initial?.name || '')
  const [desc,      setDesc]      = useState(initial?.description || '')
  const [price,     setPrice]     = useState(String(initial?.price ?? ''))
  const [catId,     setCatId]     = useState(initial?.categoryId || (categories[0]?.id ?? ''))
  const [imageUrl,  setImageUrl]  = useState(initial?.imageUrl || '')
  const [videoUrl,  setVideoUrl]  = useState(initial?.videoUrl || '')
  const [available, setAvailable] = useState(initial?.available ?? true)
  const [saving,    setSaving]    = useState(false)

  const suggested = SUGGESTED_IMAGES[name] || ''

  const handle = async () => {
    if (!name.trim()) { toast.error('Nome e obrigatorio'); return }
    if (!price || isNaN(parseFloat(price))) { toast.error('Preco invalido'); return }
    if (!catId) { toast.error('Selecione uma categoria'); return }
    setSaving(true)
    try {
      await onSave({
        name:        name.trim(),
        description: desc.trim() || undefined,
        price:       parseFloat(price),
        categoryId:  catId,
        // null limpa o campo no banco; undefined o deixa intocado
        imageUrl:    imageUrl.trim() !== '' ? imageUrl.trim() : null,
        videoUrl:    videoUrl.trim() !== '' ? videoUrl.trim() : null,
        available,
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome *</label>
        <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Nome do produto" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Categoria *</label>
          <select value={catId} onChange={e => setCatId(e.target.value)} className="input text-sm">
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Preco (R$) *</label>
          <input type="number" min={0} step={0.01} value={price} onChange={e => setPrice(e.target.value)} className="input" placeholder="0,00" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Descricao</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} className="input h-16 resize-none" placeholder="Ingredientes, acompanhamentos..." />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Imagem (capa)</label>
        <ImagePicker value={imageUrl} onChange={setImageUrl} suggestedUrl={suggested} />
        {suggested && !imageUrl && (
          <button type="button" onClick={() => setImageUrl(suggested)} className="mt-2 text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            Usar imagem sugerida para &quot;{name}&quot;
          </button>
        )}
      </div>

      {/* Campo videoUrl com picker URL/Upload */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-2">
          Video (opcional)
          <span className="text-gray-600 font-normal">— .mp4 / .webm</span>
        </label>
        <VideoPicker value={videoUrl} onChange={setVideoUrl} />
      </div>

      <div className="flex items-center gap-3 py-1">
        <button type="button" onClick={() => setAvailable(!available)}>
          {available ? <ToggleRight size={24} className="text-brand-400" /> : <ToggleLeft size={24} className="text-gray-600" />}
        </button>
        <span className="text-sm text-gray-300">{available ? 'Disponivel no cardapio' : 'Produto indisponivel'}</span>
      </div>
      <div className="flex gap-3 pt-2 sticky bottom-0 bg-card pb-1">
        <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancelar</button>
        <button onClick={handle} disabled={saving} className="btn-primary flex-1 justify-center">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {initial?.id ? 'Salvar alteracoes' : 'Criar produto'}
        </button>
      </div>
    </div>
  )
}

// ─── Card de produto ──────────────────────────────────────────────────────────
function ProductCard({ product, catName, onEdit, onToggle, onDelete }: { product: Product; catName: string; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleToggle = async () => { setToggling(true); try { await onToggle() } finally { setToggling(false) } }
  const handleDelete = async () => {
    if (!confirm(`Remover "${product.name}"?`)) return
    setDeleting(true); try { await onDelete() } finally { setDeleting(false) }
  }

  return (
    <div className={cn('card flex flex-col transition-all duration-200 hover:border-brand-500/30', !product.available && 'opacity-60')}>
      <div className="w-full h-32 rounded-t-2xl overflow-hidden flex-shrink-0">
        <ProductMediaCard
          imageUrl={product.imageUrl}
          videoUrl={product.videoUrl}
          name={product.name}
          className="w-full h-full"
        />
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="font-semibold text-white text-sm leading-tight line-clamp-2">{product.name}</p>
          <span className="text-brand-400 font-bold text-sm flex-shrink-0 ml-1">{formatCurrency(Number(product.price))}</span>
        </div>
        <p className="text-xs text-gray-500 mb-0.5">{catName}</p>
        {product.description && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 flex-1">{product.description}</p>}
        <span className={cn('inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full w-fit', product.available ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-500/15 text-gray-500')}>
          <span className={cn('w-1.5 h-1.5 rounded-full', product.available ? 'bg-emerald-400' : 'bg-gray-500')} />
          {product.available ? 'Disponivel' : 'Indisponivel'}
        </span>
      </div>
      <div className="flex border-t border-card-border">
        <button onClick={handleToggle} disabled={toggling} title={product.available ? 'Desativar' : 'Ativar'}
          className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-gray-400 hover:text-white hover:bg-card-hover transition-colors border-r border-card-border rounded-bl-2xl">
          {toggling ? <Loader2 size={13} className="animate-spin" /> : product.available ? <ToggleRight size={13} className="text-brand-400" /> : <ToggleLeft size={13} />}
          {product.available ? 'Ativo' : 'Inativo'}
        </button>
        <button onClick={onEdit} title="Editar"
          className="flex items-center justify-center px-3 py-2 text-gray-400 hover:text-white hover:bg-card-hover transition-colors border-r border-card-border">
          <Pencil size={14} />
        </button>
        <button onClick={handleDelete} disabled={deleting} title="Remover"
          className="flex items-center justify-center px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-br-2xl">
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  )
}

// ─── Pagina principal ─────────────────────────────────────────────────────────
export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products,   setProducts]   = useState<Product[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState<'products' | 'categories'>('products')
  const [selCat,     setSelCat]     = useState<string>('all')
  const [catModal,   setCatModal]   = useState(false)
  const [prodModal,  setProdModal]  = useState(false)
  const [editCat,    setEditCat]    = useState<Category | undefined>()
  const [editProd,   setEditProd]   = useState<Product | undefined>()

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([dataApi.getCategories(), dataApi.getProducts()])
      setCategories(c.data)
      setProducts(p.data)
    } catch { toast.error('Erro ao carregar cardapio') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const saveCategory = async (data: Partial<Category>) => {
    try {
      if (editCat?.id) { await dataApi.updateCategory(editCat.id, data as Record<string, unknown>); toast.success('Categoria atualizada!') }
      else             { await dataApi.createCategory(data as Record<string, unknown>); toast.success('Categoria criada!') }
      setCatModal(false); setEditCat(undefined); await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Erro ao salvar categoria'); throw err
    }
  }

  const deleteCategory = async (id: string, productCount: number) => {
    if (productCount > 0) { toast.error(`Nao e possivel excluir: ha ${productCount} produto(s) nesta categoria.`, { duration: 5000 }); return }
    if (!confirm('Excluir esta categoria?')) return
    try { await dataApi.deleteCategory(id); toast.success('Categoria excluida'); await load() }
    catch (err: unknown) { toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao excluir') }
  }

  const saveProduct = async (data: Partial<Product>) => {
    try {
      if (editProd?.id) { await dataApi.updateProduct(editProd.id, data as Record<string, unknown>); toast.success('Produto atualizado!') }
      else              { await dataApi.createProduct(data as Record<string, unknown>); toast.success('Produto criado!') }
      setProdModal(false); setEditProd(undefined); await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Erro ao salvar produto'); throw err
    }
  }

  const toggleAvailable = async (product: Product) => {
    try { await dataApi.updateProduct(product.id, { available: !product.available }); toast.success(product.available ? 'Desativado' : 'Ativado!'); await load() }
    catch { toast.error('Erro ao atualizar disponibilidade') }
  }

  const deleteProduct = async (id: string, name: string) => {
    try { await dataApi.deleteProduct(id); toast.success(`"${name}" removido`); await load() }
    catch (err: unknown) { toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao excluir') }
  }

  const filteredProducts = selCat === 'all' ? products : products.filter(p => p.categoryId === selCat)
  const getCatName = (id: string) => categories.find(c => c.id === id)?.name || '-'
  const availableCount   = products.filter(p => p.available).length
  const unavailableCount = products.length - availableCount

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in">
      <Header
        title="Cardapio"
        subtitle={`${categories.length} categorias - ${products.length} produtos (${availableCount} ativos, ${unavailableCount} inativos)`}
        onRefresh={load}
        actions={
          activeTab === 'categories'
            ? <button onClick={() => { setEditCat(undefined); setCatModal(true) }} className="btn-primary"><Plus size={16} /> Nova Categoria</button>
            : <button onClick={() => { setEditProd(undefined); setProdModal(true) }} className="btn-primary"><Plus size={16} /> Novo Produto</button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-100 p-1 rounded-xl w-fit border border-card-border">
        {(['products', 'categories'] as const).map(v => (
          <button key={v} onClick={() => setActiveTab(v)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === v ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white')}>
            {v === 'products' ? <><Package size={15} /> Produtos</> : <><Tag size={15} /> Categorias</>}
          </button>
        ))}
      </div>

      {/* Tab Produtos */}
      {activeTab === 'products' && (
        <>
          <div className="flex gap-1.5 flex-wrap mb-4">
            {[['all', 'Todos'], ...categories.map(c => [c.id, c.name])].map(([v, l]) => (
              <button key={v} onClick={() => setSelCat(v)}
                className={cn('text-sm px-3 py-1.5 rounded-full border transition-colors', selCat === v ? 'bg-brand-600 border-brand-500 text-white' : 'border-card-border text-gray-400 hover:text-white')}>
                {l}{v !== 'all' && <span className="ml-1.5 text-xs opacity-60">{products.filter(p => p.categoryId === v).length}</span>}
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-400">Nenhum produto nesta categoria</p>
              <button onClick={() => { setEditProd(undefined); setProdModal(true) }} className="btn-primary mt-4 mx-auto"><Plus size={16} /> Adicionar produto</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  catName={getCatName(product.categoryId)}
                  onEdit={() => { setEditProd(product); setProdModal(true) }}
                  onToggle={() => toggleAvailable(product)}
                  onDelete={() => deleteProduct(product.id, product.name)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab Categorias */}
      {activeTab === 'categories' && (
        <div className="space-y-2">
          {categories.map(cat => {
            const count = cat._count?.products ?? products.filter(p => p.categoryId === cat.id).length
            return (
              <div key={cat.id} className="card p-4 flex items-center gap-4 hover:border-brand-500/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-base flex-shrink-0">{cat.sortOrder}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{cat.name}</p>
                    {cat.active === false && <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">inativa</span>}
                  </div>
                  {cat.description && <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn('text-xs px-2.5 py-1 rounded-lg font-medium', count > 0 ? 'bg-brand-600/15 text-brand-400' : 'bg-surface-50 text-gray-500')}>
                    {count} produto{count !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => { setEditCat(cat); setCatModal(true) }}
                    className="p-1.5 rounded-lg border border-card-border text-gray-400 hover:text-white hover:bg-card-hover transition-colors" title="Editar">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteCategory(cat.id, count)}
                    className={cn('p-1.5 rounded-lg border border-card-border transition-colors', count > 0 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10')}
                    title={count > 0 ? `${count} produto(s) vinculado(s)` : 'Excluir categoria'}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
          {categories.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Tag size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-400">Nenhuma categoria criada</p>
              <button onClick={() => { setEditCat(undefined); setCatModal(true) }} className="btn-primary mt-4 mx-auto"><Plus size={16} /> Criar primeira categoria</button>
            </div>
          )}
        </div>
      )}

      {/* Modal Categoria */}
      <Modal open={catModal} onClose={() => { setCatModal(false); setEditCat(undefined) }} title={editCat ? 'Editar Categoria' : 'Nova Categoria'} size="sm">
        <CategoryForm initial={editCat} onSave={saveCategory} onCancel={() => { setCatModal(false); setEditCat(undefined) }} />
      </Modal>

      {/* Modal Produto */}
      <Modal open={prodModal} onClose={() => { setProdModal(false); setEditProd(undefined) }} title={editProd ? `Editar: ${editProd.name}` : 'Novo Produto'} size="lg">
        <ProductForm initial={editProd} categories={categories} onSave={saveProduct} onCancel={() => { setProdModal(false); setEditProd(undefined) }} />
      </Modal>
    </div>
  )
}
