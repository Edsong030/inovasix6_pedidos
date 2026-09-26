/**
 * Configurações do negócio: paletas de destaque, padrões, máscaras e validação.
 * As regras de validação espelham as do backend (api/src/restaurants/dto).
 */
import type { AccentColor, BusinessSettings, BusinessType, OpeningHour } from '@/types'

// ─── Cor de destaque ──────────────────────────────────────────────────────────

/**
 * Só paletas pré-aprovadas: texto branco sobre o tom 600 (botões) e os tons
 * 300/400 sobre o fundo escuro passam de 4,5:1 (WCAG AA). Valores em "R G B".
 */
export const ACCENT_PRESETS: Record<AccentColor, { label: string; swatch: string; shades: Record<300 | 400 | 500 | 600 | 700, string> }> = {
  inovasix: { label: 'Inovasix',          swatch: '#2a3ef5', shades: { 300: '147 176 255', 400: '96 136 255',  500: '61 94 255',  600: '42 62 245',  700: '31 45 224' } },
  violet:   { label: 'Violeta',           swatch: '#7c3aed', shades: { 300: '196 181 253', 400: '167 139 250', 500: '139 92 246', 600: '124 58 237', 700: '109 40 217' } },
  cyan:     { label: 'Ciano',             swatch: '#0e7490', shades: { 300: '103 232 249', 400: '34 211 238',  500: '8 145 178',  600: '14 116 144', 700: '21 94 117' } },
  emerald:  { label: 'Esmeralda',         swatch: '#047857', shades: { 300: '110 231 183', 400: '52 211 153',  500: '5 150 105',  600: '4 120 87',   700: '6 95 70' } },
  rose:     { label: 'Rosa',              swatch: '#e11d48', shades: { 300: '253 164 175', 400: '251 113 133', 500: '244 63 94',  600: '225 29 72',  700: '190 18 60' } },
  orange:   { label: 'Laranja',           swatch: '#c2410c', shades: { 300: '253 186 116', 400: '251 146 60',  500: '234 88 12',  600: '194 65 12',  700: '154 52 18' } },
}

export const ACCENT_COLORS = Object.keys(ACCENT_PRESETS) as AccentColor[]

/** Aplica a paleta nas variáveis CSS usadas pelas classes brand-300…700. */
export function applyAccent(color: AccentColor) {
  const root = document.documentElement
  if (color === 'inovasix') return clearAccent()
  for (const [shade, rgb] of Object.entries(ACCENT_PRESETS[color].shades)) {
    root.style.setProperty(`--brand-${shade}`, rgb)
  }
}

/** Volta ao azul/roxo Inovasix definido em globals.css. */
export function clearAccent() {
  for (const shade of [300, 400, 500, 600, 700]) document.documentElement.style.removeProperty(`--brand-${shade}`)
}

// ─── Funcionamento ────────────────────────────────────────────────────────────

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
/** Ordem de exibição: segunda a domingo */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

const HOURS_BY_TYPE: Record<BusinessType, { opensAt: string; closesAt: string; closed: number[] }> = {
  RESTAURANT:    { opensAt: '11:00', closesAt: '23:00', closed: [1] },
  SNACK_BAR:     { opensAt: '18:00', closesAt: '02:00', closed: [1] },
  CONFECTIONERY: { opensAt: '09:00', closesAt: '19:00', closed: [0] },
  JAPANESE:      { opensAt: '18:00', closesAt: '23:30', closed: [1] },
}

export function defaultOpeningHours(type: BusinessType): OpeningHour[] {
  const h = HOURS_BY_TYPE[type] ?? HOURS_BY_TYPE.RESTAURANT
  return Array.from({ length: 7 }, (_, day) => ({ day, open: !h.closed.includes(day), opensAt: h.opensAt, closesAt: h.closesAt }))
}

// ─── Padrões ──────────────────────────────────────────────────────────────────

export function defaultSettings(type: BusinessType, name: string): BusinessSettings {
  return {
    name,
    businessType: type,
    phone: '', whatsapp: '', email: '', cnpj: '',
    logoUrl: '',
    accentColor: 'inovasix',
    zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: '',
    openingHours: defaultOpeningHours(type),
    avgPrepMinutes: 30,
    acceptingOrders: true,
    showUnavailableProducts: false,
    orderMessage: '',
  }
}

/** Campos de identidade, funcionamento e operação (sem dados cadastrais nem endereço). */
export function defaultPreferences(type: BusinessType): Pick<BusinessSettings,
  'logoUrl' | 'accentColor' | 'openingHours' | 'avgPrepMinutes' | 'acceptingOrders' | 'showUnavailableProducts' | 'orderMessage'> {
  const d = defaultSettings(type, '')
  return {
    logoUrl: d.logoUrl, accentColor: d.accentColor, openingHours: d.openingHours, avgPrepMinutes: d.avgPrepMinutes,
    acceptingOrders: d.acceptingOrders, showUnavailableProducts: d.showUnavailableProducts, orderMessage: d.orderMessage,
  }
}

// ─── Máscaras ─────────────────────────────────────────────────────────────────

export const digits = (s: string) => (s ?? '').replace(/\D/g, '')

export function formatPhone(value: string): string {
  const d = digits(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function formatCep(value: string): string {
  const d = digits(value).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export function formatCnpj(value: string): string {
  const d = digits(value).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function isValidCnpj(value: string): boolean {
  const d = digits(value)
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((s, w, i) => s + Number(d[i]) * w, 0)
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

// ─── Validação ────────────────────────────────────────────────────────────────

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export const LIMITS = {
  name: 80, email: 120, street: 120, number: 10, complement: 60, district: 60, city: 60,
  orderMessage: 160, logoUrl: 500, prepMin: 1, prepMax: 240,
}

export const LOGO_MAX_BYTES = 2 * 1024 * 1024
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** URL aceita para o logo: http(s), caminho de upload da API ou imagem local (só na demo). */
export function isValidLogoUrl(url: string, allowDataUrl: boolean): boolean {
  if (!url) return true
  if (allowDataUrl && /^data:image\/(png|jpeg|webp);base64,/.test(url)) return true
  if (url.length > LIMITS.logoUrl) return false
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch { return false }
}

/** Retorna um mapa campo → mensagem. Vazio quando está tudo certo. Recebe valores já normalizados. */
export function validateSettings(s: BusinessSettings, opts: { allowDataUrl: boolean }): Record<string, string> {
  const e: Record<string, string> = {}
  const name = s.name.trim()
  if (name.length < 2) e.name = 'Informe o nome do estabelecimento (mínimo 2 caracteres).'
  else if (name.length > LIMITS.name) e.name = `Máximo de ${LIMITS.name} caracteres.`

  if (s.phone && !/^\d{10,11}$/.test(s.phone)) e.phone = 'Telefone com DDD: 10 ou 11 dígitos.'
  if (s.whatsapp && !/^\d{10,11}$/.test(s.whatsapp)) e.whatsapp = 'WhatsApp com DDD: 10 ou 11 dígitos.'
  if (s.email && (!EMAIL.test(s.email) || s.email.length > LIMITS.email)) e.email = 'E-mail inválido.'
  if (s.cnpj && !isValidCnpj(s.cnpj)) e.cnpj = 'CNPJ inválido. Confira os 14 dígitos.'

  if (!isValidLogoUrl(s.logoUrl, opts.allowDataUrl)) e.logoUrl = 'Use um endereço http(s):// válido de uma imagem.'
  if (!ACCENT_COLORS.includes(s.accentColor)) e.accentColor = 'Escolha uma das cores disponíveis.'

  if (s.zipCode && !/^\d{8}$/.test(s.zipCode)) e.zipCode = 'CEP com 8 dígitos.'
  if (s.street.length > LIMITS.street) e.street = `Máximo de ${LIMITS.street} caracteres.`
  if (s.number.length > LIMITS.number) e.number = `Máximo de ${LIMITS.number} caracteres.`
  if (s.complement.length > LIMITS.complement) e.complement = `Máximo de ${LIMITS.complement} caracteres.`
  if (s.district.length > LIMITS.district) e.district = `Máximo de ${LIMITS.district} caracteres.`
  if (s.city.length > LIMITS.city) e.city = `Máximo de ${LIMITS.city} caracteres.`
  if (s.state && !UFS.includes(s.state)) e.state = 'UF inválida.'

  s.openingHours.forEach(h => {
    if (!h.open) return
    if (!TIME.test(h.opensAt) || !TIME.test(h.closesAt)) e[`hours.${h.day}`] = 'Informe abertura e encerramento.'
    else if (h.opensAt === h.closesAt) e[`hours.${h.day}`] = 'Abertura e encerramento não podem ser iguais.'
  })

  if (!Number.isInteger(s.avgPrepMinutes) || s.avgPrepMinutes < LIMITS.prepMin || s.avgPrepMinutes > LIMITS.prepMax) {
    e.avgPrepMinutes = `Entre ${LIMITS.prepMin} e ${LIMITS.prepMax} minutos.`
  }
  if (s.orderMessage.length > LIMITS.orderMessage) e.orderMessage = `Máximo de ${LIMITS.orderMessage} caracteres.`
  return e
}

/** Remove máscaras e espaços antes de validar/salvar. */
export function normalizeSettings(s: BusinessSettings): BusinessSettings {
  return {
    ...s,
    name: s.name.trim(),
    phone: digits(s.phone),
    whatsapp: digits(s.whatsapp),
    email: s.email.trim().toLowerCase(),
    cnpj: digits(s.cnpj),
    logoUrl: s.logoUrl.trim(),
    zipCode: digits(s.zipCode),
    street: s.street.trim(),
    number: s.number.trim(),
    complement: s.complement.trim(),
    district: s.district.trim(),
    city: s.city.trim(),
    state: s.state.trim().toUpperCase(),
    orderMessage: s.orderMessage.trim(),
  }
}

/** Formata os campos com máscara para exibir no formulário. */
export function toFormValues(s: BusinessSettings): BusinessSettings {
  return { ...s, phone: formatPhone(s.phone), whatsapp: formatPhone(s.whatsapp), cnpj: formatCnpj(s.cnpj), zipCode: formatCep(s.zipCode) }
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

/** Confere tipo e tamanho do arquivo do logo. Retorna a mensagem de erro ou null. */
export function checkLogoFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!LOGO_TYPES.includes(file.type) || !['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return 'Formato não permitido. Use PNG, JPG ou WebP.'
  }
  if (file.size > LOGO_MAX_BYTES) {
    return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: 2 MB.`
  }
  return null
}

/**
 * Demo: reduz o logo para no máximo 512 px e devolve como data URL,
 * para caber no armazenamento do navegador.
 */
export function logoToDataUrl(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Não foi possível processar a imagem.'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      // WebP mantém transparência e fica pequeno; PNG como alternativa
      const webp = canvas.toDataURL('image/webp', 0.9)
      resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Arquivo de imagem inválido.')) }
    img.src = url
  })
}
