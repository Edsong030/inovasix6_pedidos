'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { BrandFooter } from '@/components/brand'
import { IS_DEMO } from '@/lib/demo'

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  if (isLoading) return <PageLoader />
  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/*
        Área de conteúdo principal.
        Aplica o fundo visual apenas fora do modo demo (GitHub Pages).
        No modo demo a imagem não está disponível como asset estático com basePath.
      */}
      <div className={`flex-1 flex flex-col overflow-hidden${IS_DEMO ? '' : ' dashboard-bg'}`}>
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1400px] mx-auto">{children}</div>
        </main>
        <BrandFooter />
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  )
}
