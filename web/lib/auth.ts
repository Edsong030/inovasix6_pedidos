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
