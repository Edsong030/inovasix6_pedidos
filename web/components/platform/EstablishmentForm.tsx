'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, Loader2, MapPin, ShieldCheck, UserRound } from 'lucide-react'
import { BUSINESS_TYPES, getBusinessProfile } from '@/lib/business'
import { UFS, digits, formatCep, formatPhone, isValidCnpj } from '@/lib/settings'
import { passwordProblem } from '@/lib/permissions'
import { formatDocument, slugProblem, slugify, type EstablishmentForm as FormValues, type InitialAdminForm } from '@/lib/platform'
import { cn } from '@/lib/utils'

export const EMPTY_ESTABLISHMENT: FormValues = {
  name: '', slug: '', businessType: 'RESTAURANT', document: '', ownerName: '', email: '',
  phone: '', whatsapp: '', zipCode: '', street: '', number: '', complement: '', district: '',
  city: '', state: '', active: true,
}
const EMPTY_ADMIN: InitialAdminForm = { name: '', email: '', password: '' }

/** Mesmas regras da API; a API valida de novo (CPF com dígitos verificadores inclusive). */
function validate(v: FormValues, admin: InitialAdminForm | null): Record<string, string> {
  const e: Record<string, string> = {}
  if (v.name.trim().length < 2) e.name = 'Informe o nome do estabelecimento'
  if (admin) {
    const s = slugProblem(v.slug)
    if (s) e.slug = s
  }
  const doc = digits(v.document)
  if (doc.length !== 11 && doc.length !== 14) e.document = 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)'
  else if (doc.length === 14 && !isValidCnpj(doc)) e.document = 'CNPJ inválido'
  if (v.ownerName.trim().length < 2) e.ownerName = 'Informe o nome do responsável'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'E-mail inválido'
  if (!/^\d{10,11}$/.test(digits(v.phone))) e.phone = 'Telefone deve ter 10 ou 11 dígitos'
  if (v.whatsapp && !/^\d{10,11}$/.test(digits(v.whatsapp))) e.whatsapp = 'WhatsApp deve ter 10 ou 11 dígitos'
  if (!/^\d{8}$/.test(digits(v.zipCode))) e.zipCode = 'CEP deve ter 8 dígitos'
  if (v.street.trim().length < 2) e.street = 'Informe o endereço'
  if (v.city.trim().length < 2) e.city = 'Informe a cidade'
  if (!UFS.includes(v.state)) e.state = 'Selecione a UF'
  if (admin) {
    if (admin.name.trim().length < 2) e.adminName = 'Informe o nome do administrador'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email.trim())) e.adminEmail = 'E-mail inválido'
    const p = passwordProblem(admin.password)
    if (p) e.adminPassword = p
  }
  return e
}

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="card panel-tech p-5 max-sm:p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white mb-4">
        <span className="text-brand-300">{icon}</span>{title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  )
}

/**
 * Cadastro (com administrador inicial) ou edição de estabelecimento cliente.
 * Na edição o slug não muda e o status é alterado pela listagem.
 */
export function EstablishmentForm({
  mode, initial, onSubmit,
}: {
  mode: 'create' | 'edit'
  initial?: FormValues
  onSubmit: (values: FormValues, admin: InitialAdminForm | null) => Promise<void>
}) {
  const creating = mode === 'create'
  const [v, setV] = useState<FormValues>(() => initial
    ? { ...initial, document: formatDocument(initial.document), phone: formatPhone(initial.phone), whatsapp: formatPhone(initial.whatsapp), zipCode: formatCep(initial.zipCode) }
    : EMPTY_ESTABLISHMENT)
  const [admin, setAdmin] = useState<InitialAdminForm>(EMPTY_ADMIN)
  const [slugEdited, setSlugEdited] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setV(prev => ({ ...prev, [key]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validate(v, creating ? admin : null)
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try { await onSubmit(v, creating ? admin : null) }
    catch { /* a página mostra a mensagem da API */ }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Section icon={<Building2 size={18} />} title="Estabelecimento">
        <Field label="Nome do estabelecimento *" error={errors.name}>
          <input
            className="input" value={v.name} maxLength={80}
            onChange={(e) => {
              set('name', e.target.value)
              if (creating && !slugEdited) set('slug', slugify(e.target.value))
            }}
          />
        </Field>
        <Field label={creating ? 'Slug (usado no login) *' : 'Slug (usado no login)'} error={errors.slug}>
          <input
            className="input font-mono text-sm disabled:opacity-60" value={v.slug} maxLength={50}
            disabled={!creating} placeholder="pizzaria-do-joao" autoCapitalize="none" spellCheck={false}
            onChange={(e) => { setSlugEdited(true); set('slug', e.target.value.toLowerCase()) }}
          />
          {!creating && <p className="text-xs text-gray-500 mt-1">O slug não pode ser alterado: é o identificador de login dos usuários.</p>}
        </Field>
        <Field label="Segmento *">
          <select className="input" value={v.businessType} onChange={(e) => set('businessType', e.target.value as FormValues['businessType'])}>
            {BUSINESS_TYPES.map(t => <option key={t} value={t}>{getBusinessProfile(t).label}</option>)}
          </select>
        </Field>
        <Field label="CNPJ ou CPF *" error={errors.document}>
          <input className="input" inputMode="numeric" value={v.document} maxLength={18}
            onChange={(e) => set('document', formatDocument(digits(e.target.value).slice(0, 14)))} />
        </Field>
        {creating && (
          <label className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/2 p-3.5 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand-500))]" checked={v.active} onChange={(e) => set('active', e.target.checked)} />
            <span className="text-sm text-gray-200">Ativo (o administrador já pode entrar)</span>
          </label>
        )}
      </Section>

      <Section icon={<UserRound size={18} />} title="Responsável e contato">
        <Field label="Nome do responsável *" error={errors.ownerName}>
          <input className="input" value={v.ownerName} maxLength={80} onChange={(e) => set('ownerName', e.target.value)} />
        </Field>
        <Field label="E-mail *" error={errors.email}>
          <input className="input" type="email" value={v.email} maxLength={120} autoCapitalize="none" onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Telefone *" error={errors.phone}>
          <input className="input" inputMode="tel" value={v.phone} placeholder="(11) 99999-9999" onChange={(e) => set('phone', formatPhone(e.target.value))} />
        </Field>
        <Field label="WhatsApp" error={errors.whatsapp}>
          <input className="input" inputMode="tel" value={v.whatsapp} placeholder="(11) 99999-9999" onChange={(e) => set('whatsapp', formatPhone(e.target.value))} />
        </Field>
      </Section>

      <Section icon={<MapPin size={18} />} title="Endereço">
        <Field label="CEP *" error={errors.zipCode}>
          <input className="input" inputMode="numeric" value={v.zipCode} placeholder="00000-000" onChange={(e) => set('zipCode', formatCep(e.target.value))} />
        </Field>
        <Field label="Endereço (rua, avenida) *" error={errors.street}>
          <input className="input" value={v.street} maxLength={120} onChange={(e) => set('street', e.target.value)} />
        </Field>
        <Field label="Número">
          <input className="input" value={v.number} maxLength={10} onChange={(e) => set('number', e.target.value)} />
        </Field>
        <Field label="Complemento">
          <input className="input" value={v.complement} maxLength={60} onChange={(e) => set('complement', e.target.value)} />
        </Field>
        <Field label="Bairro">
          <input className="input" value={v.district} maxLength={60} onChange={(e) => set('district', e.target.value)} />
        </Field>
        <div className="grid grid-cols-[1fr_6rem] gap-4 min-w-0">
          <Field label="Cidade *" error={errors.city}>
            <input className="input" value={v.city} maxLength={60} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="UF *" error={errors.state}>
            <select className="input" value={v.state} onChange={(e) => set('state', e.target.value)}>
              <option value="">—</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      {creating && (
        <Section icon={<ShieldCheck size={18} />} title="Administrador inicial">
          <p className="sm:col-span-2 -mt-2 text-xs text-gray-400">
            Primeiro usuário ADMIN do estabelecimento. Depois ele cria os próprios usuários internos.
          </p>
          <Field label="Nome *" error={errors.adminName}>
            <input className="input" value={admin.name} maxLength={80} onChange={(e) => setAdmin(a => ({ ...a, name: e.target.value }))} />
          </Field>
          <Field label="E-mail de login *" error={errors.adminEmail}>
            <input className="input" type="email" value={admin.email} autoCapitalize="none" autoComplete="off"
              onChange={(e) => setAdmin(a => ({ ...a, email: e.target.value }))} />
          </Field>
          <Field label="Senha inicial *" error={errors.adminPassword} className="sm:col-span-2">
            <input className="input" type="password" value={admin.password} autoComplete="new-password" maxLength={128}
              onChange={(e) => setAdmin(a => ({ ...a, password: e.target.value }))} />
            <p className="text-xs text-gray-500 mt-1">Mínimo de 10 caracteres, com letras e números. Entregue ao cliente por um canal seguro.</p>
          </Field>
        </Section>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/platform/establishments" className="btn-secondary max-sm:flex-1 max-sm:justify-center">Cancelar</Link>
        <button type="submit" disabled={saving} className="btn-primary max-sm:flex-1 max-sm:justify-center">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {creating ? 'Cadastrar estabelecimento' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
