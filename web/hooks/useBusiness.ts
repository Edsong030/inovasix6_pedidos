import { useAuth } from '@/hooks/useAuth'
import { getBusinessProfile, type BusinessProfile } from '@/lib/business'

/** Perfil do tipo de negócio do usuário logado (padrão: Restaurante). */
export function useBusiness(): BusinessProfile {
  const { user } = useAuth()
  return getBusinessProfile(user?.businessType)
}
