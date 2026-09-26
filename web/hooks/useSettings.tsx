'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { dataApi } from '@/hooks/useApi'
import { IS_DEMO, demoStore, clearDemoSettings, getDemoSettings } from '@/lib/demo'
import { applyAccent, clearAccent } from '@/lib/settings'
import type { BusinessSettings, BusinessType } from '@/types'

interface SettingsContextType {
  /** null enquanto carrega ou se não foi possível carregar */
  settings: BusinessSettings | null
  loading: boolean
  failed: boolean
  reload: () => Promise<void>
  save: (next: BusinessSettings) => Promise<BusinessSettings>
  /** Demo: volta as configurações e a operação (cardápio, pedidos) do tipo atual ao original */
  restoreDemo: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | null>(null)

/** Configurações do negócio do usuário logado. Aplica a cor de destaque escolhida. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, patchUser } = useAuth()
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [failed,   setFailed]   = useState(false)
  /** Tipo de negócio da sessão no momento em que as configurações foram carregadas */
  const [loadedFor, setLoadedFor] = useState<BusinessType | undefined>()

  const userId       = user?.id
  const businessType = user?.businessType

  const reload = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await dataApi.getSettings()
      setSettings(data)
      setLoadedFor(businessType)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
    // businessType: recarrega quando o tipo de negócio é trocado
  }, [userId, businessType])

  useEffect(() => { reload() }, [reload])

  // A sessão (cookie) guarda nome e tipo do login; o que está salvo prevalece,
  // para sidebar e cabeçalho mobile ficarem coerentes após recarregar
  const savedName = settings?.name
  const savedType = settings?.businessType
  useEffect(() => {
    if (!user || !savedName || !savedType) return
    // Durante uma troca de tipo as configurações ainda são do tipo anterior: espera recarregar
    if (loadedFor !== user.businessType) return
    if (user.restaurantName !== savedName || user.businessType !== savedType) {
      patchUser({ restaurantName: savedName, businessType: savedType })
    }
  }, [user, savedName, savedType, loadedFor, patchUser])

  const accent = settings?.accentColor
  useEffect(() => { if (accent) applyAccent(accent) }, [accent])
  // Ao sair (logout), a tela de login volta ao azul/roxo padrão
  useEffect(() => () => clearAccent(), [])

  const save = useCallback(async (next: BusinessSettings) => {
    const { data } = await dataApi.updateSettings(next)
    setSettings(data)
    patchUser({ restaurantName: data.name })
    return data
  }, [patchUser])

  const restoreDemo = useCallback(async () => {
    if (!IS_DEMO || !businessType) return
    clearDemoSettings()
    demoStore.reset()
    patchUser({ restaurantName: getDemoSettings(businessType).name })
    await reload()
  }, [businessType, patchUser, reload])

  return (
    <SettingsContext.Provider value={{ settings, loading, failed, reload, save, restoreDemo }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
