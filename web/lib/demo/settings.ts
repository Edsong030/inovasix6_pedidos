/**
 * Configurações do negócio na demo (GitHub Pages): ficam no localStorage de
 * cada navegador, separadas por tipo de negócio. Nada vai para a rede.
 */
import type { BusinessSettings, BusinessType } from '@/types'
import { defaultSettings } from '@/lib/settings'
import { getDemoDataset } from './data'

const KEY = 'inovasix-demo-settings'

const DEMO_CONTACT: Record<BusinessType, Partial<BusinessSettings>> = {
  RESTAURANT:    { email: 'contato@restaurantedemo.com.br', street: 'Rua das Flores',    number: '123', district: 'Centro',       avgPrepMinutes: 30 },
  SNACK_BAR:     { email: 'pedidos@lanchonetedemo.com.br',  street: 'Avenida Paulista',  number: '900', district: 'Bela Vista',   avgPrepMinutes: 15 },
  CONFECTIONERY: { email: 'encomendas@confeitariademo.com.br', street: 'Rua Augusta',    number: '450', district: 'Consolação',   avgPrepMinutes: 45 },
  JAPANESE:      { email: 'contato@japonesdemo.com.br',     street: 'Rua Galvão Bueno',  number: '88',  district: 'Liberdade',    avgPrepMinutes: 35 },
}

/** Dados de fábrica da demonstração para o tipo informado. */
export function demoDefaultSettings(type: BusinessType): BusinessSettings {
  return {
    ...defaultSettings(type, getDemoDataset(type).restaurantName),
    phone: '1133334444',
    whatsapp: '11999999999',
    zipCode: '01000000',
    city: 'São Paulo',
    state: 'SP',
    orderMessage: 'Obrigado pelo pedido! Avisaremos quando estiver pronto.',
    ...DEMO_CONTACT[type],
  }
}

// Vale mesmo quando o navegador bloqueia o armazenamento local
let memory: Partial<Record<BusinessType, BusinessSettings>> = {}

function readAll(): Partial<Record<BusinessType, BusinessSettings>> {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
    if (raw) memory = JSON.parse(raw)
  } catch { /* armazenamento indisponível ou corrompido: usa a memória */ }
  return memory
}

export function getDemoSettings(type: BusinessType): BusinessSettings {
  const saved = readAll()[type]
  // Mescla com os padrões para aceitar campos novos em dados antigos
  return saved ? { ...demoDefaultSettings(type), ...saved, businessType: type } : demoDefaultSettings(type)
}

/** Salva as configurações do tipo. Lança erro se o navegador não tiver espaço. */
export function saveDemoSettings(settings: BusinessSettings) {
  const all = { ...readAll(), [settings.businessType]: settings }
  memory = all
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all))
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new Error('Sem espaço no navegador para salvar. Use um logo menor ou uma URL externa.')
    }
    // Armazenamento bloqueado: vale só nesta sessão
  }
}

/**
 * Volta a demonstração inteira (todos os tipos) aos dados de fábrica.
 * Como o nome personalizado acompanha o negócio ao trocar de tipo, limpar só
 * o tipo atual faria o nome antigo reaparecer ao trocar de novo.
 */
export function clearDemoSettings() {
  memory = {}
  try { window.localStorage.removeItem(KEY) } catch { /* só nesta sessão */ }
}
