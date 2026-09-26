'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Building2, Palette, MapPin, Clock, SlidersHorizontal, Upload, Link as LinkIcon, Trash2, ImageOff,
  Loader2, Save, RotateCcw, CircleCheck, CircleAlert, Check, TriangleAlert, Store,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { dataApi } from '@/hooks/useApi'
import { IS_DEMO } from '@/lib/demo'
import { asset } from '@/lib/asset'
import { cn } from '@/lib/utils'
import { BUSINESS_TYPES, getBusinessProfile } from '@/lib/business'
import {
  ACCENT_COLORS, ACCENT_PRESETS, LIMITS, UFS, WEEKDAYS, WEEK_ORDER,
  checkLogoFile, defaultPreferences, formatCep, formatCnpj, formatPhone, logoToDataUrl,
  normalizeSettings, toFormValues, validateSettings,
} from '@/lib/settings'
import type { AccentColor, BusinessSettings, BusinessType, OpeningHour, UserRole } from '@/types'

const PANEL = 'card panel-tech'
const INPUT = 'input text-sm bg-[#0c1330] [color-scheme:dark]'
const ALLOWED_ROLES: UserRole[] = ['ADMIN', 'MANAGER']

function apiMessage(err: unknown): string | undefined {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  return Array.isArray(msg) ? msg[0] : msg
}

// ─── Componentes de formulário ────────────────────────────────────────────────
function Section({ icon: Icon, title, description, action, className, children }: {
  icon: React.ElementType; title: string; description: string; action?: ReactNode; className?: string; children: ReactNode
}) {
  return (
    <section className={cn(PANEL, 'p-5 min-w-0', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-brand-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ id, label, hint, error, className, children }: {
  id: string; label: string; hint?: string; error?: string; className?: string; children: ReactNode
}) {
  return (
    <div className={cn('min-w-0', className)} data-error={error ? 'true' : undefined}>
      <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
      {error
        ? <p id={`${id}-error`} className="mt-1 text-xs text-red-300">{error}</p>
        : hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}

/** Atributos de acessibilidade/estilo para um campo com possível erro. */
const errProps = (id: string, error?: string) => ({
  id,
  'aria-invalid': !!error || undefined,
  'aria-describedby': error ? `${id}-error` : undefined,
  className: cn(INPUT, error && 'border-red-400/60 focus:ring-red-400'),
})

function Switch({ id, checked, onChange, label }: { id?: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        checked ? 'bg-brand-600 border-brand-500' : 'bg-white/10 border-white/15',
      )}
    >
      <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  )
}

function ConfirmDialog({ open, title, children, confirmLabel, busy, onConfirm, onClose }: {
  open: boolean; title: string; children: ReactNode; confirmLabel: string; busy?: boolean; onConfirm: () => void; onClose: () => void
}) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title} size="md">
      <div className="space-y-3 text-sm text-gray-300">{children}</div>
      <div className="flex flex-wrap justify-end gap-3 mt-6">
        <button type="button" onClick={onClose} disabled={busy} className="btn-secondary justify-center whitespace-nowrap max-sm:flex-1">Cancelar</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="btn-primary justify-center whitespace-nowrap max-sm:flex-1">
          {busy && <Loader2 size={14} className="animate-spin" />} {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function LogoEditor({ value, error, onChange }: { value: string; error?: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [broken,    setBroken]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const isLocal = value.startsWith('data:')
  const [url, setUrl] = useState(isLocal ? '' : value)

  useEffect(() => { setBroken(false); if (!value.startsWith('data:')) setUrl(value) }, [value])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const problem = checkLogoFile(file)
    if (problem) { toast.error(problem); return }
    setUploading(true)
    try {
      onChange(IS_DEMO ? await logoToDataUrl(file) : await dataApi.uploadLogo(file))
      toast.success('Logo carregado. Salve as alterações para aplicar.')
    } catch (err) {
      toast.error(apiMessage(err) || (err as Error).message || 'Não foi possível enviar o logo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative w-28 h-28 flex-shrink-0 rounded-2xl border border-white/10 bg-[#0c1330] flex items-center justify-center overflow-hidden max-sm:mx-auto">
        {value && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset(value)} alt="Pré-visualização do logo" className="max-w-full max-h-full object-contain p-2" onError={() => setBroken(true)} />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-gray-500 text-center px-2">
            <ImageOff size={22} />
            <span className="text-[11px] leading-tight">{broken ? 'Imagem não carregou' : 'Sem logo'}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 size={22} className="text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef} type="file" className="hidden"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            onChange={handleFile} aria-label="Arquivo do logo"
          />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary text-sm justify-center whitespace-nowrap max-sm:flex-1">
            <Upload size={15} /> Enviar arquivo
          </button>
          {value && (
            <button type="button" onClick={() => { onChange(''); setUrl('') }} className="btn-secondary text-sm justify-center whitespace-nowrap text-red-300 hover:text-red-200 max-sm:flex-1">
              <Trash2 size={15} /> Remover
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          PNG, JPG ou WebP, até 2 MB.{IS_DEMO && ' Na demonstração o arquivo fica só neste navegador.'}
        </p>
        <Field id="logoUrl" label="Ou use uma URL externa" error={error}>
          <div className="relative">
            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              {...errProps('logoUrl', error)}
              className={cn(errProps('logoUrl', error).className, 'pl-8')}
              type="url" inputMode="url" placeholder={isLocal ? 'Usando arquivo enviado' : 'https://…/logo.png'}
              value={url}
              maxLength={LIMITS.logoUrl}
              onChange={e => setUrl(e.target.value)}
              onBlur={() => { if (url.trim() !== (isLocal ? '' : value)) onChange(url.trim()) }}
            />
          </div>
        </Field>
      </div>
    </div>
  )
}

// ─── Cor de destaque ──────────────────────────────────────────────────────────
const rgb = (color: AccentColor, shade: 300 | 600) => `rgb(${ACCENT_PRESETS[color].shades[shade]})`

function AccentPicker({ value, onChange }: { value: AccentColor; onChange: (c: AccentColor) => void }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-2" id="accent-label">Cor de destaque</p>
      <div role="radiogroup" aria-labelledby="accent-label" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ACCENT_COLORS.map(c => {
          const active = value === c
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(c)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors min-w-0',
                active ? 'border-white/40 bg-white/[0.06] text-white' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20',
              )}
            >
              <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: ACCENT_PRESETS[c].swatch }}>
                {active && <Check size={12} className="text-white" />}
              </span>
              <span className="truncate">{ACCENT_PRESETS[c].label}</span>
            </button>
          )
        })}
      </div>
      {/* Prévia com a paleta escolhida (aplicada no sistema depois de salvar) */}
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0c1330] px-3 py-2.5">
        <span className="text-xs text-gray-500">Prévia:</span>
        <span className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: rgb(value, 600) }}>Novo pedido</span>
        <span className="text-xs font-medium" style={{ color: rgb(value, 300) }}>Ver todos →</span>
      </div>
      <p className="mt-2 text-xs text-gray-500">Inovasix é a cor padrão. Todas as opções têm contraste adequado sobre o tema escuro.</p>
    </div>
  )
}

// ─── Horários ─────────────────────────────────────────────────────────────────
function HoursEditor({ hours, errors, onChange }: { hours: OpeningHour[]; errors: Record<string, string>; onChange: (h: OpeningHour[]) => void }) {
  const update = (day: number, patch: Partial<OpeningHour>) =>
    onChange(hours.map(h => (h.day === day ? { ...h, ...patch } : h)))

  return (
    <ul className="divide-y divide-white/5 -my-2">
      {WEEK_ORDER.map(day => {
        const h = hours.find(x => x.day === day)!
        const error = errors[`hours.${day}`]
        const overnight = h.open && h.closesAt < h.opensAt
        return (
          <li key={day} className="py-3" data-error={error ? 'true' : undefined}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-3 w-full sm:w-40">
                <Switch checked={h.open} onChange={v => update(day, { open: v })} label={`${WEEKDAYS[day]}: ${h.open ? 'aberto' : 'fechado'}`} />
                <span className="text-sm font-medium text-white">{WEEKDAYS[day]}</span>
                <span className={cn('ml-auto sm:hidden text-xs', h.open ? 'text-emerald-300' : 'text-gray-500')}>{h.open ? 'Aberto' : 'Fechado'}</span>
              </div>
              {h.open ? (
                <div className="flex items-center gap-2 max-sm:w-full">
                  <label className="sr-only" htmlFor={`open-${day}`}>Abertura de {WEEKDAYS[day]}</label>
                  <input id={`open-${day}`} type="time" value={h.opensAt} onChange={e => update(day, { opensAt: e.target.value })}
                    className={cn(INPUT, 'w-full sm:w-[7.5rem]', error && 'border-red-400/60')} />
                  <span className="text-gray-500 text-sm">às</span>
                  <label className="sr-only" htmlFor={`close-${day}`}>Encerramento de {WEEKDAYS[day]}</label>
                  <input id={`close-${day}`} type="time" value={h.closesAt} onChange={e => update(day, { closesAt: e.target.value })}
                    className={cn(INPUT, 'w-full sm:w-[7.5rem]', error && 'border-red-400/60')} />
                </div>
              ) : (
                <span className="max-sm:hidden inline-flex rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-500">Fechado</span>
              )}
              {overnight && !error && <span className="text-xs text-gray-500 max-sm:w-full">Encerra no dia seguinte</span>}
            </div>
            {error && <p className="mt-1.5 text-xs text-red-300">{error}</p>}
          </li>
        )
      })}
    </ul>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, setBusinessType } = useAuth()
  const { settings, loading, failed, reload, save, restoreDemo } = useSettings()

  const [form,    setForm]    = useState<BusinessSettings | null>(null)
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [saving,  setSaving]  = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [pendingType, setPendingType] = useState<BusinessType | null>(null)
  const [switching,   setSwitching]   = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [restoring,      setRestoring]      = useState(false)

  // O formulário acompanha o que está salvo (carga inicial, troca de tipo, restauração)
  useEffect(() => { if (settings) { setForm(toFormValues(settings)); setErrors({}) } }, [settings])

  const dirty = useMemo(() => {
    if (!form || !settings) return false
    return JSON.stringify(normalizeSettings(form)) !== JSON.stringify(normalizeSettings(toFormValues(settings)))
  }, [form, settings])

  // Aviso do navegador ao sair com alterações não salvas
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!user) return null
  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="animate-fade-in">
        <Header title="Configurações" />
        <div className={cn(PANEL, 'p-8 text-center text-sm text-gray-400')}>Apenas administradores e gerentes podem alterar as configurações.</div>
      </div>
    )
  }
  if (loading && !form) return <PageLoader />
  if (failed && !form) {
    return (
      <div className="animate-fade-in">
        <Header title="Configurações" />
        <div className={cn(PANEL, 'p-8 text-center')}>
          <p className="text-sm text-red-300">Não foi possível carregar as configurações.</p>
          <button onClick={reload} className="btn-secondary mx-auto mt-4">Tentar novamente</button>
        </div>
      </div>
    )
  }
  if (!form || !settings) return <PageLoader />

  const business       = getBusinessProfile(settings.businessType)
  const canChangeType  = IS_DEMO || user.role === 'ADMIN'
  const set = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) => {
    setForm(f => (f ? { ...f, [key]: value } : f))
    if (errors[key as string]) setErrors(e => { const n = { ...e }; delete n[key as string]; return n })
  }
  const text = (key: 'name' | 'email' | 'street' | 'number' | 'complement' | 'district' | 'city' | 'orderMessage') => ({
    ...errProps(key, errors[key]),
    value: form[key],
    maxLength: LIMITS[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
  })

  const handleSave = async () => {
    const normalized = normalizeSettings(form)
    const found = validateSettings(normalized, { allowDataUrl: IS_DEMO })
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error('Revise os campos destacados antes de salvar.')
      requestAnimationFrame(() => document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    setSaving(true)
    try {
      await save(normalized)
      setSavedAt(new Date())
      toast.success('Configurações salvas com sucesso.')
    } catch (err) {
      toast.error(apiMessage(err) || (err as Error).message || 'Não foi possível salvar as configurações.')
    } finally {
      setSaving(false)
    }
  }

  const confirmTypeChange = async () => {
    if (!pendingType) return
    setSwitching(true)
    try {
      await setBusinessType(pendingType)   // recarrega as configurações do novo tipo
      setSavedAt(null)
    } finally {
      setSwitching(false)
      setPendingType(null)
    }
  }

  const handleRestore = async () => {
    if (IS_DEMO) {
      setRestoring(true)
      try {
        await restoreDemo()
        setSavedAt(null)
        toast.success(`${business.demoName} restaurada.`)
      } catch {
        toast.error('Não foi possível restaurar a demonstração.')
      } finally {
        setRestoring(false)
        setConfirmRestore(false)
      }
      return
    }
    // Sistema real: só preenche o formulário; nada é gravado até salvar
    setForm(f => (f ? { ...f, ...defaultPreferences(f.businessType) } : f))
    setErrors({})
    setConfirmRestore(false)
    toast.success('Padrões aplicados no formulário. Clique em Salvar alterações para confirmar.')
  }

  const pendingProfile = pendingType ? getBusinessProfile(pendingType) : null
  const today = settings.openingHours.find(h => h.day === new Date().getDay())

  return (
    <div className="animate-fade-in">
      <Header title="Configurações" subtitle={`Personalize dados, identidade e operação ${business.ofYourBusiness}`} />

      {/* Resumo do que está salvo */}
      <div className={cn(PANEL, 'p-4 sm:p-5 mb-5 flex flex-wrap items-center gap-4')}>
        <div className="w-14 h-14 rounded-2xl border border-white/10 bg-[#0c1330] flex items-center justify-center overflow-hidden flex-shrink-0">
          {settings.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={asset(settings.logoUrl)} alt="" className="max-w-full max-h-full object-contain p-1.5" />
            : <Store size={22} className="text-brand-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-gray-500">{business.label}</p>
          <p className="text-lg font-semibold text-white truncate">{settings.name}</p>
        </div>
        <div className="flex flex-wrap gap-2 max-sm:w-full">
          <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
            settings.acceptingOrders ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/30 bg-amber-500/10 text-amber-200')}>
            {settings.acceptingOrders ? <CircleCheck size={13} /> : <CircleAlert size={13} />}
            {settings.acceptingOrders ? 'Aceitando pedidos' : 'Pedidos pausados'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-300">
            <Clock size={13} className="text-brand-300" />
            Hoje: {today?.open ? `${today.opensAt}–${today.closesAt}` : 'fechado'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-300">
            <span className="w-3 h-3 rounded-full" style={{ background: ACCENT_PRESETS[settings.accentColor].swatch }} />
            {ACCENT_PRESETS[settings.accentColor].label}
          </span>
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); handleSave() }} noValidate>
        {/* Até xl: uma coluna na ordem das seções. xl+: duas colunas. */}
        <div className="flex flex-col gap-5 xl:grid xl:grid-cols-2 xl:items-start">
          <div className="max-xl:contents xl:flex xl:flex-col xl:gap-5">
            {/* Dados do negócio */}
            <Section icon={Building2} title="Dados do negócio" description="Identificação e contatos do estabelecimento" className="max-xl:order-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field id="name" label="Nome do estabelecimento *" error={errors.name} hint="Aparece no menu lateral e no cabeçalho" className="md:col-span-2">
                  <input {...text('name')} autoComplete="organization" />
                </Field>
                <Field id="businessType" label="Tipo de negócio"
                  hint={canChangeType ? (IS_DEMO ? 'Troca o cardápio e a operação da demonstração' : 'Ajusta textos e recursos do sistema') : 'Somente o administrador pode alterar'}>
                  <select
                    id="businessType"
                    value={form.businessType}
                    disabled={!canChangeType || switching}
                    onChange={e => { const t = e.target.value as BusinessType; if (t !== settings.businessType) setPendingType(t) }}
                    className={cn(INPUT, 'disabled:opacity-60')}
                  >
                    {BUSINESS_TYPES.map(t => <option key={t} value={t}>{getBusinessProfile(t).label}</option>)}
                  </select>
                </Field>
                <Field id="cnpj" label="CNPJ (opcional)" error={errors.cnpj}>
                  <input {...errProps('cnpj', errors.cnpj)} inputMode="numeric" placeholder="00.000.000/0000-00"
                    value={form.cnpj} onChange={e => set('cnpj', formatCnpj(e.target.value))} />
                </Field>
                <Field id="phone" label="Telefone" error={errors.phone}>
                  <input {...errProps('phone', errors.phone)} type="tel" inputMode="tel" placeholder="(11) 3333-4444" autoComplete="tel"
                    value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))} />
                </Field>
                <Field id="whatsapp" label="WhatsApp" error={errors.whatsapp}>
                  <input {...errProps('whatsapp', errors.whatsapp)} type="tel" inputMode="tel" placeholder="(11) 99999-9999"
                    value={form.whatsapp} onChange={e => set('whatsapp', formatPhone(e.target.value))} />
                </Field>
                <Field id="email" label="E-mail" error={errors.email} className="md:col-span-2">
                  <input {...text('email')} type="email" inputMode="email" placeholder="contato@seunegocio.com.br" autoComplete="email" />
                </Field>
              </div>
            </Section>

            {/* Endereço */}
            <Section icon={MapPin} title="Endereço" description="Preenchido manualmente (sem consulta automática de CEP)" className="max-xl:order-3">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <Field id="zipCode" label="CEP" error={errors.zipCode} className="md:col-span-2">
                  <input {...errProps('zipCode', errors.zipCode)} inputMode="numeric" placeholder="00000-000" autoComplete="postal-code"
                    value={form.zipCode} onChange={e => set('zipCode', formatCep(e.target.value))} />
                </Field>
                <Field id="street" label="Rua" error={errors.street} className="md:col-span-4">
                  <input {...text('street')} autoComplete="address-line1" />
                </Field>
                <Field id="number" label="Número" error={errors.number} className="md:col-span-2">
                  <input {...text('number')} />
                </Field>
                <Field id="complement" label="Complemento" error={errors.complement} className="md:col-span-4">
                  <input {...text('complement')} placeholder="Sala, loja, bloco…" autoComplete="address-line2" />
                </Field>
                <Field id="district" label="Bairro" error={errors.district} className="md:col-span-2">
                  <input {...text('district')} />
                </Field>
                <Field id="city" label="Cidade" error={errors.city} className="md:col-span-3">
                  <input {...text('city')} autoComplete="address-level2" />
                </Field>
                <Field id="state" label="UF" error={errors.state} className="md:col-span-1">
                  <select {...errProps('state', errors.state)} value={form.state} onChange={e => set('state', e.target.value)}>
                    <option value="">—</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </Field>
              </div>
            </Section>

            {/* Operação */}
            <Section icon={SlidersHorizontal} title="Operação" description="Preferências do dia a dia" className="max-xl:order-5">
              <div className="space-y-5">
                <Field id="avgPrepMinutes" label="Tempo médio estimado de preparo" error={errors.avgPrepMinutes} hint={`Entre ${LIMITS.prepMin} e ${LIMITS.prepMax} minutos`}>
                  <div className="relative w-full sm:w-44">
                    <input {...errProps('avgPrepMinutes', errors.avgPrepMinutes)} type="number" min={LIMITS.prepMin} max={LIMITS.prepMax} step={1}
                      className={cn(errProps('avgPrepMinutes', errors.avgPrepMinutes).className, 'pr-12')}
                      value={Number.isNaN(form.avgPrepMinutes) ? '' : form.avgPrepMinutes}
                      onChange={e => set('avgPrepMinutes', e.target.value === '' ? NaN : Number(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">min</span>
                  </div>
                </Field>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                  <div className="min-w-0">
                    <label htmlFor="acceptingOrders" className="text-sm font-medium text-white">Aceitar pedidos</label>
                    <p className="text-xs text-gray-500 mt-0.5">Quando desligado, a tela de novo pedido mostra que o recebimento está pausado.</p>
                  </div>
                  <Switch id="acceptingOrders" checked={form.acceptingOrders} onChange={v => set('acceptingOrders', v)} label="Aceitar pedidos" />
                </div>
                <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                  <div className="min-w-0">
                    <label htmlFor="showUnavailableProducts" className="text-sm font-medium text-white">Exibir produtos indisponíveis</label>
                    <p className="text-xs text-gray-500 mt-0.5">Mostra itens esgotados ao montar um pedido, marcados como indisponíveis.</p>
                  </div>
                  <Switch id="showUnavailableProducts" checked={form.showUnavailableProducts} onChange={v => set('showUnavailableProducts', v)} label="Exibir produtos indisponíveis" />
                </div>

                <Field id="orderMessage" label="Mensagem curta para pedidos" error={errors.orderMessage}
                  hint={`${form.orderMessage.length}/${LIMITS.orderMessage} caracteres · exibida ao registrar um pedido`}>
                  <textarea {...text('orderMessage')} rows={2} className={cn(errProps('orderMessage', errors.orderMessage).className, 'resize-none')}
                    placeholder="Ex.: Obrigado pela preferência! Tempo médio de 30 minutos." />
                </Field>
              </div>
            </Section>
          </div>

          <div className="max-xl:contents xl:flex xl:flex-col xl:gap-5">
            {/* Identidade visual */}
            <Section icon={Palette} title="Identidade visual" description="Logo e cor de destaque do sistema" className="max-xl:order-2">
              <div className="space-y-6">
                <LogoEditor value={form.logoUrl} error={errors.logoUrl} onChange={v => set('logoUrl', v)} />
                <AccentPicker value={form.accentColor} onChange={c => set('accentColor', c)} />
              </div>
            </Section>

            {/* Funcionamento */}
            <Section
              icon={Clock}
              title="Funcionamento"
              description="Dias e horários de atendimento"
              className="max-xl:order-4"
              action={
                <button
                  type="button"
                  onClick={() => {
                    const base = WEEK_ORDER.map(d => form.openingHours.find(h => h.day === d)!).find(h => h.open)
                    if (base) set('openingHours', form.openingHours.map(h => (h.open ? { ...h, opensAt: base.opensAt, closesAt: base.closesAt } : h)))
                  }}
                  className="text-xs font-medium text-brand-300 hover:text-white whitespace-nowrap"
                >
                  Copiar 1º horário para todos
                </button>
              }
            >
              <HoursEditor hours={form.openingHours} errors={errors} onChange={h => set('openingHours', h)} />
            </Section>
          </div>
        </div>

        {/* Restauração */}
        <div className={cn(PANEL, 'mt-5 p-5 flex flex-wrap items-center gap-4')}>
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-sm font-semibold text-white">{IS_DEMO ? 'Restaurar dados da demonstração' : 'Restaurar padrões'}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {IS_DEMO
                ? `Volta as configurações, o cardápio e os pedidos da ${business.demoName} ao estado original.`
                : 'Volta logo, cor, horários e operação ao padrão. Dados do negócio e endereço não mudam.'}
            </p>
          </div>
          <button type="button" onClick={() => setConfirmRestore(true)} className="btn-secondary justify-center text-sm max-sm:w-full">
            <RotateCcw size={15} /> {IS_DEMO ? 'Restaurar dados da demonstração' : 'Restaurar padrões'}
          </button>
        </div>

        {/* Barra de salvar (fixa no rodapé da área de conteúdo) */}
        <div className="sticky bottom-0 z-20 mt-5 pb-4 lg:pb-0 lg:-mb-2 pointer-events-none">
          {/* Fundo sólido + blur: o conteúdo que rola por baixo não aparece através da barra */}
          <div
            className={cn(PANEL, 'pointer-events-auto flex flex-wrap items-center gap-3 px-4 py-3 border backdrop-blur-md')}
            style={{ background: 'linear-gradient(180deg, #111a3d 0%, #0b1030 100%)' }}
          >
            <p className="min-w-0 flex-1 basis-40 max-sm:basis-full text-xs">
              {dirty
                ? <span className="inline-flex items-center gap-1.5 text-amber-200"><TriangleAlert size={13} /> Alterações não salvas</span>
                : savedAt
                  ? <span className="inline-flex items-center gap-1.5 text-emerald-300"><CircleCheck size={13} /> Salvo às {savedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  : <span className="text-gray-500">Nenhuma alteração pendente</span>}
            </p>
            {dirty && (
              <button type="button" onClick={() => { setForm(toFormValues(settings)); setErrors({}) }} className="btn-secondary text-sm justify-center whitespace-nowrap max-sm:flex-1">
                Descartar
              </button>
            )}
            <button type="submit" disabled={saving || !dirty} className="btn-primary text-sm justify-center whitespace-nowrap max-sm:flex-1">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Salvar alterações
            </button>
          </div>
        </div>
      </form>

      {/* Confirmação: troca do tipo de negócio */}
      <ConfirmDialog
        open={!!pendingType}
        title={`Trocar para ${pendingProfile?.label ?? ''}?`}
        confirmLabel="Confirmar troca"
        busy={switching}
        onConfirm={confirmTypeChange}
        onClose={() => setPendingType(null)}
      >
        {IS_DEMO ? (
          <p>
            O <strong className="text-white">cardápio, os pedidos, as mesas e a operação</strong> da demonstração serão
            trocados pelos da <strong className="text-white">{pendingProfile?.demoName}</strong>.
            As configurações de cada tipo ficam guardadas separadamente neste navegador.
          </p>
        ) : (
          <p>
            Os textos e recursos do sistema passam a ser os de <strong className="text-white">{pendingProfile?.label}</strong>
            {pendingType === 'CONFECTIONERY' ? ' (por exemplo, “Cozinha” vira “Produção”)' : ''}.
            Seu cardápio e seus pedidos não são alterados.
          </p>
        )}
        {dirty && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-amber-200">
            <TriangleAlert size={15} className="mt-0.5 flex-shrink-0" /> As alterações não salvas nesta tela serão descartadas.
          </p>
        )}
      </ConfirmDialog>

      {/* Confirmação: restaurar */}
      <ConfirmDialog
        open={confirmRestore}
        title={IS_DEMO ? 'Restaurar dados da demonstração?' : 'Restaurar padrões?'}
        confirmLabel={IS_DEMO ? 'Restaurar' : 'Aplicar padrões'}
        busy={restoring}
        onConfirm={handleRestore}
        onClose={() => setConfirmRestore(false)}
      >
        {IS_DEMO ? (
          <>
            <p>As configurações da <strong className="text-white">{business.demoName}</strong> voltam ao original (nome, logo, cor, endereço, horários e operação).</p>
            <p>O cardápio, os pedidos e as mesas da demonstração também são recarregados. Pedidos criados nesta sessão serão perdidos.</p>
          </>
        ) : (
          <p>Logo, cor de destaque, horários e operação voltam ao padrão no formulário. Nada é gravado até você clicar em <strong className="text-white">Salvar alterações</strong>.</p>
        )}
      </ConfirmDialog>
    </div>
  )
}
