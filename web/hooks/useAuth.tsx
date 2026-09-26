'use client'

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { saveAuth, clearAuth, getStoredUser, getToken } from '@/lib/auth'
import {
  IS_DEMO, DEMO_CREDENTIALS, DEMO_USER,
  demoStore, getDemoSettings, getDemoBusinessType, saveDemoBusinessType,
} from '@/lib/demo'
import { dataApi } from '@/hooks/useApi'
import type { AuthUser, BusinessType } from '@/types'
import toast from 'react-hot-toast'

const DEMO_TOKEN = 'demo-jwt-token'

interface AuthContextType {
  user:      AuthUser | null
  isLoading: boolean
  login:     (email: string, password: string, slug: string) => Promise<void>
  logout:    () => void
  /** Troca o tipo de negócio (na demo, troca entre Restaurante/Lanchonete/Confeitaria Demo) */
  setBusinessType: (type: BusinessType) => Promise<void>
  /** Atualiza dados exibidos do estabelecimento (ex.: nome na sidebar após salvar as configurações) */
  patchUser: (patch: Partial<Pick<AuthUser, 'restaurantName'>>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

/** Na demo, nome e tipo vêm da demonstração escolhida e das configurações salvas nela. */
function withDemoBusiness(user: AuthUser): AuthUser {
  const type = getDemoBusinessType()
  return { ...user, businessType: type, restaurantName: getDemoSettings(type).name }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setUser(IS_DEMO ? withDemoBusiness(stored) : stored)
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
      demoStore.switchBusiness(getDemoBusinessType())
      const demoUser = withDemoBusiness({ ...DEMO_USER, role: cred.role, email: cred.email })
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

  const setBusinessType = useCallback(async (type: BusinessType) => {
    if (!user || user.businessType === type) return

    if (IS_DEMO) {
      // Tudo local: troca o conjunto de dados da demo, sem rede
      saveDemoBusinessType(type)
      demoStore.switchBusiness(type)
      const next = withDemoBusiness(user)
      saveAuth(DEMO_TOKEN, next)
      setUser(next)
      toast.success(`${next.restaurantName} carregada`)
      return
    }

    try {
      await dataApi.updateBusinessType(type)
      const next = { ...user, businessType: type }
      const token = getToken()
      if (token) saveAuth(token, next)
      setUser(next)
      toast.success('Tipo de negócio atualizado')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Não foi possível alterar o tipo de negócio')
    }
  }, [user])

  const patchUser = useCallback((patch: Partial<Pick<AuthUser, 'restaurantName'>>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      const token = getToken()
      if (token) saveAuth(token, next)
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setBusinessType, patchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
