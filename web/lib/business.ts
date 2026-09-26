/**
 * Perfil por tipo de negócio: textos e recursos que mudam entre
 * Restaurante, Lanchonete, Confeitaria e Restaurante Japonês. O padrão é Restaurante.
 */
import type { BusinessType, SaleUnit } from '@/types'

export interface BusinessProfile {
  type: BusinessType
  /** Nome do tipo ("Restaurante") */
  label: string
  /** Nome da loja demo */
  demoName: string
  /** Nome da área de preparo no menu e nas telas ("Cozinha" / "Produção") */
  kitchenLabel: string
  /** Complemento com preposição: "na cozinha" / "na produção" */
  inKitchen: string
  /** "do seu restaurante" / "da sua lanchonete" / "da sua confeitaria" */
  ofYourBusiness: string
  /** Texto de apoio do login/seletor */
  tagline: string
  /** Canais oferecidos por padrão ao criar um pedido, em ordem */
  channels: Array<'COUNTER' | 'DINE_IN' | 'DELIVERY' | 'TAKEOUT' | 'IFOOD' | 'WHATSAPP'>
}

export const BUSINESS_PROFILES: Record<BusinessType, BusinessProfile> = {
  RESTAURANT: {
    type: 'RESTAURANT',
    label: 'Restaurante',
    demoName: 'Restaurante Demo',
    kitchenLabel: 'Cozinha',
    inKitchen: 'na cozinha',
    ofYourBusiness: 'do seu restaurante',
    tagline: 'Salão, delivery e cozinha',
    channels: ['COUNTER', 'DINE_IN', 'DELIVERY', 'TAKEOUT', 'IFOOD', 'WHATSAPP'],
  },
  SNACK_BAR: {
    type: 'SNACK_BAR',
    label: 'Lanchonete',
    demoName: 'Lanchonete Demo',
    kitchenLabel: 'Cozinha',
    inKitchen: 'na cozinha',
    ofYourBusiness: 'da sua lanchonete',
    tagline: 'Lanches, combos e açaí com adicionais',
    channels: ['COUNTER', 'DELIVERY', 'IFOOD', 'WHATSAPP', 'DINE_IN', 'TAKEOUT'],
  },
  CONFECTIONERY: {
    type: 'CONFECTIONERY',
    label: 'Confeitaria',
    demoName: 'Confeitaria Demo',
    kitchenLabel: 'Produção',
    inKitchen: 'na produção',
    ofYourBusiness: 'da sua confeitaria',
    tagline: 'Bolos, doces e encomendas por kg ou cento',
    channels: ['COUNTER', 'WHATSAPP', 'TAKEOUT', 'DELIVERY', 'IFOOD', 'DINE_IN'],
  },
  JAPANESE: {
    type: 'JAPANESE',
    label: 'Japonês',
    demoName: 'Japonês Demo',
    kitchenLabel: 'Cozinha',
    inKitchen: 'na cozinha',
    ofYourBusiness: 'do seu restaurante japonês',
    tagline: 'Sushi, temaki, combinados e pratos quentes',
    channels: ['DELIVERY', 'IFOOD', 'DINE_IN', 'TAKEOUT', 'WHATSAPP', 'COUNTER'],
  },
}

export const BUSINESS_TYPES: BusinessType[] = ['RESTAURANT', 'SNACK_BAR', 'CONFECTIONERY', 'JAPANESE']

export function getBusinessProfile(type?: BusinessType | null): BusinessProfile {
  return BUSINESS_PROFILES[type ?? 'RESTAURANT'] ?? BUSINESS_PROFILES.RESTAURANT
}

// ─── Unidades de venda ────────────────────────────────────────────────────────

/** Sufixo do preço: "/kg", "/cento" ou vazio. */
export function priceSuffix(unit?: SaleUnit | null): string {
  if (unit === 'KG') return '/kg'
  if (unit === 'HUNDRED') return '/cento'
  return ''
}

/** Quantidade legível: "2×", "1,5 kg", "2 centos". Aceita string decimal da API. */
export function formatQuantity(quantity: number | string, unit?: SaleUnit | null): string {
  const q = Number(quantity)
  const n = q.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
  if (unit === 'KG') return `${n} kg`
  if (unit === 'HUNDRED') return `${n} ${q === 1 ? 'cento' : 'centos'}`
  return `${n}×`
}

/** Passo do campo de quantidade: 0,1 kg para quilo; 1 para unidade e cento. */
export function quantityStep(unit?: SaleUnit | null): number {
  return unit === 'KG' ? 0.1 : 1
}
