/**
 * Retorna o caminho correto para um asset público,
 * considerando o basePath do GitHub Pages quando em modo demo.
 *
 * Ex:
 *   asset('/brand/logo.png')
 *   → local:       '/brand/logo.png'
 *   → GitHub Pages: '/inovasix6_pedidos/brand/logo.png'
 *
 * Arquivos enviados à API ('/uploads/...', URL relativa devolvida quando PUBLIC_API_URL
 * não está configurada) são servidos pela API, não pelo web: no modo API viram
 * '<origem da API>/uploads/...', com a origem vinda de NEXT_PUBLIC_API_URL.
 *
 * URLs externas (http/https, //cdn), data: e blob: são retornadas sem alteração,
 * assim como caminhos que já contêm o basePath.
 */
export const BASE_PATH =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? '/inovasix6_pedidos' : ''

const EXTERNAL_URL = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i

/** Origem da API (sem "/api"), a partir de NEXT_PUBLIC_API_URL; '' se ausente/inválida. */
export function apiOrigin(apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'): string {
  try {
    const u = new URL(apiUrl)
    return `${u.origin}${u.pathname.replace(/\/+$/, '').replace(/\/api$/, '')}`
  } catch {
    return ''
  }
}

export function asset(path: string): string {
  if (!path || EXTERNAL_URL.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (!BASE_PATH && normalized.startsWith('/uploads/')) return `${apiOrigin()}${normalized}`
  if (BASE_PATH && (normalized === BASE_PATH || normalized.startsWith(`${BASE_PATH}/`))) {
    return normalized
  }
  return `${BASE_PATH}${normalized}`
}
