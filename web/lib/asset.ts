/**
 * Retorna o caminho correto para um asset público,
 * considerando o basePath do GitHub Pages quando em modo demo.
 *
 * Ex:
 *   asset('/brand/logo.png')
 *   → local:       '/brand/logo.png'
 *   → GitHub Pages: '/inovasix6_pedidos/brand/logo.png'
 */
export const BASE_PATH =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? '/inovasix6_pedidos' : ''

export function asset(path: string): string {
  // path deve começar com /
  return `${BASE_PATH}${path}`
}
