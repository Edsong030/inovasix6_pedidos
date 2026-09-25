'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Raiz do app — redireciona para /login.
 * Usa useRouter (client-side) em vez de redirect() do servidor,
 * pois redirect() de Server Component é incompatível com output:'export'.
 */
export default function RootPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/login') }, [router])
  return null
}
