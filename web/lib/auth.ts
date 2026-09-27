import Cookies from 'js-cookie'
import type { AuthUser } from '@/types'

const TOKEN_KEY = 'token'
const USER_KEY  = 'user'

export function saveAuth(token: string, user: AuthUser) {
  Cookies.set(TOKEN_KEY, token, { expires: 1, sameSite: 'strict' })
  Cookies.set(USER_KEY, JSON.stringify(user), { expires: 1, sameSite: 'strict' })
}

export function clearAuth() {
  Cookies.remove(TOKEN_KEY)
  Cookies.remove(USER_KEY)
}

/**
 * Modo API: descarta tudo o que pertence à sessão atual antes de entrar em outro
 * estabelecimento — token e usuário (cookies) e qualquer dado do app guardado no
 * navegador (ex.: estado da demo publicada aberta antes em localhost). Cache, carrinho
 * e telas vivem só na memória da página e somem com a navegação completa que segue.
 */
export function clearSession() {
  clearAuth()
  // Demo publicada: o cenário escolhido (inovasix-demo-business) e as configurações de
  // cada tipo (inovasix-demo-settings) são dados legítimos do visitante; nunca apagar
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      Object.keys(storage).filter(k => k.startsWith('inovasix')).forEach(k => storage.removeItem(k))
    } catch { /* armazenamento indisponível: nada guardado */ }
  }
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  const raw = Cookies.get(USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) }
  catch { return null }
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
