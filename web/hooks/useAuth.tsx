'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { saveAuth, clearAuth, getStoredUser } from '@/lib/auth'
import type { AuthUser } from '@/types'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string, slug: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setUser(stored)
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string, restaurantSlug: string) => {
    try {
      const { data } = await api.post('/auth/login', { email, password, restaurantSlug })
      saveAuth(data.accessToken, data.user)
      setUser(data.user)
      toast.success(`Bem-vindo, ${data.user.name}!`)
      router.push('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Credenciais inválidas'
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
