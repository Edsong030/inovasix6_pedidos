'use client'

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { saveAuth, clearAuth, getStoredUser } from '@/lib/auth'
import { IS_DEMO, DEMO_CREDENTIALS, DEMO_USER } from '@/lib/demo'
import type { AuthUser } from '@/types'
import toast from 'react-hot-toast'

const DEMO_TOKEN = 'demo-jwt-token'

interface AuthContextType {
  user:      AuthUser | null
  isLoading: boolean
  login:     (email: string, password: string, slug: string) => Promise<void>
  logout:    () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setUser(stored)
    setIsLoading(false)
  }, [])

  const login = useCallback(async (
    email: string,
    password: string,
    restaurantSlug: string,
  ) => {
    // ── Modo demo: autentica localmente sem API ──
    if (IS_DEMO) {
      const cred = DEMO_CREDENTIALS.find(
        c => c.email === email && c.password === password,
      )
      if (!cred) {
        toast.error('Credenciais inválidas')
        throw new Error('invalid credentials')
      }
      const demoUser: AuthUser = { ...DEMO_USER, role: cred.role, email: cred.email }
      saveAuth(DEMO_TOKEN, demoUser)
      setUser(demoUser)
      toast.success(`Bem-vindo, ${demoUser.name}!`)
      router.push('/dashboard')
      return
    }

    // ── Modo normal: chama API real ──
    try {
      const { data } = await api.post('/auth/login', { email, password, restaurantSlug })
      saveAuth(data.accessToken, data.user)
      setUser(data.user)
      toast.success(`Bem-vindo, ${data.user.name}!`)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? 'Credenciais inválidas'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
      throw err
    }
  }, [router])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
