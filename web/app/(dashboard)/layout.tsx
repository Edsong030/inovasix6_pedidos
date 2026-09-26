'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { TechBackdrop } from '@/components/layout/TechBackdrop'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { BrandFooter } from '@/components/brand'
import { asset } from '@/lib/asset'

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  if (isLoading) return <PageLoader />
  if (!user) return null

  // URL do fundo com basePath correto (funciona local e no GitHub Pages)
  const bgUrl = asset('/brand/dashboard-background.png')
  // Dashboard e Relatórios usam fundo tecnológico próprio (sem foto)
  const plainBackground = ['/dashboard', '/reports'].some(p => pathname?.startsWith(p))

  return (
    <div className="flex h-screen overflow-hidden relative" style={plainBackground ? { background: '#081030' } : undefined}>
      {/* Fundo tecnológico cobre a tela toda (aparece também atrás da sidebar) */}
      {plainBackground && <TechBackdrop />}
      <Sidebar />

      {/*
        Área de conteúdo com fundo visual.
        - background-image inline → usa bgUrl com basePath correto
        - Sem opacity no contêiner pai (não afeta sidebar, logo nem textos)
        - Sobreposição escura via pseudo-elemento ::before emulado com div absoluto
      */}
      <div
        className="flex-1 flex flex-col overflow-hidden relative"
        style={plainBackground ? undefined : {
          backgroundImage:    `url('${bgUrl}')`,
          backgroundSize:     'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundRepeat:   'no-repeat',
        }}
      >
        {!plainBackground && (
          /* Sobreposição escura suave — opacidade 0.38, sem blur no conteúdo */
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(10, 11, 18, 0.38)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}

        {/* Conteúdo acima da sobreposição */}
        <main className="flex-1 overflow-y-auto relative" style={{ zIndex: 1 }}>
          {/* key: ao trocar o tipo de negócio a página é remontada e recarrega os dados */}
          <div key={user.businessType ?? 'RESTAURANT'} className="p-6 max-w-[1400px] mx-auto">{children}</div>
        </main>
        <div className="relative" style={{ zIndex: 1 }}>
          <BrandFooter />
        </div>
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
