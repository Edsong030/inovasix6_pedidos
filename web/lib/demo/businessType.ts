/**
 * Tipo de negócio escolhido na demo (Restaurante, Lanchonete ou Confeitaria).
 * Fica só no navegador de quem está vendo a demo; não há banco nem rede.
 */
import type { BusinessType } from '@/types'

const KEY = 'inovasix-demo-business'
const VALID: BusinessType[] = ['RESTAURANT', 'SNACK_BAR', 'CONFECTIONERY']

// Vale mesmo quando o navegador bloqueia o armazenamento local
let current: BusinessType | null = null

export function getDemoBusinessType(): BusinessType {
  if (current) return current
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
    if (v && (VALID as string[]).includes(v)) current = v as BusinessType
  } catch { /* armazenamento indisponível */ }
  return current ?? 'RESTAURANT'
}

export function saveDemoBusinessType(type: BusinessType) {
  current = type
  try { window.localStorage.setItem(KEY, type) } catch { /* vale só nesta sessão */ }
}
