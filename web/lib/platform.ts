/**
 * Área da plataforma (PLATFORM_ADMIN): cadastro e gestão de estabelecimentos clientes.
 * Só no modo API — a demo publicada (GitHub Pages) não tem esta área.
 * O restaurantId de cada cliente é sempre gerado pela API; o frontend só envia os dados.
 */
import api from '@/lib/api'
import type { BusinessType, EstablishmentDetail, EstablishmentSummary } from '@/types'

/** Campos do formulário (CPF/CNPJ, telefone e CEP podem ir com máscara: a API limpa). */
export interface EstablishmentForm {
  name: string
  slug: string
  businessType: BusinessType
  document: string
  ownerName: string
  email: string
  phone: string
  whatsapp: string
  zipCode: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  active: boolean
}

export interface InitialAdminForm {
  name: string
  email: string
  password: string
}

export const platformApi = {
  list: () => api.get<EstablishmentSummary[]>('/platform/establishments'),
  get: (id: string) => api.get<EstablishmentDetail>(`/platform/establishments/${encodeURIComponent(id)}`),
  create: (data: EstablishmentForm, admin: InitialAdminForm) =>
    api.post<EstablishmentDetail>('/platform/establishments', { ...data, admin }),
  /** Slug e status não vão na edição (slug é fixo; status tem rota própria). */
  update: (id: string, data: Omit<EstablishmentForm, 'slug' | 'active'>) =>
    api.patch<EstablishmentDetail>(`/platform/establishments/${encodeURIComponent(id)}`, data),
  setActive: (id: string, active: boolean) =>
    api.patch<EstablishmentDetail>(`/platform/establishments/${encodeURIComponent(id)}/status`, { active }),
}

/** Mesma regra do slug na API. Retorna a mensagem de erro ou null. */
export function slugProblem(slug: string): string | null {
  if (slug.length < 3 || slug.length > 50) return 'O slug deve ter entre 3 e 50 caracteres'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'Use letras minúsculas, números e hífens (ex.: pizzaria-do-joao)'
  return null
}

/** Sugestão de slug a partir do nome ("Pizzaria do João" → "pizzaria-do-joao"). */
export function slugify(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '')
}

/** Mensagem de erro da API (class-validator devolve lista). */
export function apiMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  return (Array.isArray(msg) ? msg[0] : msg) || fallback
}

/** CPF (11) ou CNPJ (14) formatado para exibição. */
export function formatDocument(digits: string): string {
  if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  return digits
}
