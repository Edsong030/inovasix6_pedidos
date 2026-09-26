'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, ChefHat, Table2,
  UtensilsCrossed, BarChart3, Users, LogOut, CakeSlice, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { InovasixLogo } from '@/components/brand/InovasixLogo'
import { IS_DEMO } from '@/lib/demo'
import { BUSINESS_TYPES, getBusinessProfile } from '@/lib/business'
import type { BusinessType, UserRole } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: UserRole[]
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard',  icon: <LayoutDashboard size={18} /> },
  { href: '/orders',    label: 'Pedidos',    icon: <ShoppingBag size={18} />,     roles: ['ADMIN','MANAGER','ATTENDANT','DELIVERY'] },
  { href: '/kitchen',   label: 'Cozinha',    icon: <ChefHat size={18} />,         roles: ['ADMIN','MANAGER','KITCHEN','ATTENDANT'] },
  { href: '/tables',    label: 'Mesas',      icon: <Table2 size={18} />,          roles: ['ADMIN','MANAGER','ATTENDANT'] },
  { href: '/menu',      label: 'Cardápio',   icon: <UtensilsCrossed size={18} />, roles: ['ADMIN','MANAGER'] },
  { href: '/reports',   label: 'Relatórios', icon: <BarChart3 size={18} />,       roles: ['ADMIN','MANAGER'] },
  { href: '/users',     label: 'Usuários',   icon: <Users size={18} />,           roles: ['ADMIN','MANAGER'] },
]

/** Marca, estabelecimento, navegação e usuário — usado na sidebar fixa e no menu mobile. */
function SidebarContent({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  const pathname = usePathname()
  const { user, logout, setBusinessType } = useAuth()
  const business = getBusinessProfile(user?.businessType)

  // Confeitaria: "Cozinha" vira "Produção"
  const visible = NAV
    .filter((n) => !n.roles || (user && n.roles.includes(user.role)))
    .map((n) => n.href === '/kitchen'
      ? { ...n, label: business.kitchenLabel, icon: business.type === 'CONFECTIONERY' ? <CakeSlice size={18} /> : n.icon }
      : n)

  // Demo: qualquer perfil troca a demonstração. Sistema real: apenas administrador.
  const canChangeBusiness = !!user && (IS_DEMO || user.role === 'ADMIN')

  return (
    <>
      {/* ── Área de marca ─────────────────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center"
        style={{
          minHeight: 88,
          padding: '12px 16px',
          borderBottom: '1px solid rgba(99, 102, 241, 0.12)',
        }}
      >
        <InovasixLogo variant="sidebar" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="absolute top-2 right-2 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Restaurante */}
      {user && (
        <div
          className="px-5 py-3"
          style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.12)' }}
        >
          <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(148, 163, 184, 0.7)' }}>
            {business.label}
          </p>
          <p className="text-sm font-medium text-white truncate mt-0.5">{user.restaurantName}</p>
          {canChangeBusiness && (
            <label className="mt-2.5 block">
              <span className="sr-only">Tipo de negócio</span>
              <select
                value={business.type}
                onChange={(e) => { setBusinessType(e.target.value as BusinessType); onNavigate?.() }}
                aria-label={IS_DEMO ? 'Trocar demonstração' : 'Tipo de negócio'}
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium text-gray-200 outline-none transition-colors focus:ring-2 focus:ring-brand-500 [color-scheme:dark]"
                style={{ background: 'rgba(15, 22, 52, 0.9)', borderColor: 'rgba(96, 136, 255, 0.25)' }}
              >
                {BUSINESS_TYPES.map((t) => {
                  const p = getBusinessProfile(t)
                  return <option key={t} value={t}>{IS_DEMO ? p.demoName : p.label}</option>
                })}
              </select>
            </label>
          )}
        </div>
      )}

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visible.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20'
                  // inativo: cinza claro legível, hover com fundo translúcido
                  : 'border border-transparent hover:bg-white/5',
              )}
              style={active ? {} : { color: '#cbd5e1' }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Usuário + logout */}
      {user && (
        <div
          className="px-3 pb-4 pt-4"
          style={{ borderTop: '1px solid rgba(99, 102, 241, 0.12)' }}
        >
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-400 text-sm font-bold flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(148, 163, 184, 0.7)' }}>
                {user.role}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium transition-all hover:bg-red-500/10 hover:text-red-400"
            style={{ color: '#94a3b8' }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}
    </>
  )
}

/** Sidebar fixa — somente a partir de 1024px. */
export function Sidebar() {
  const pathname = usePathname()

  // Dashboard e Relatórios: sidebar levemente translúcida sobre o fundo tecnológico
  const overTechBackground = ['/dashboard', '/reports'].some(p => pathname.startsWith(p))

  return (
    <aside
      className="hidden lg:flex flex-col h-screen sticky top-0"
      style={{
        width: 280,
        minWidth: 280,
        // Fundo próprio com leve blur — não usa opacity no pai
        // para não escurecer logo, textos e ícones
        background: overTechBackground ? 'rgba(7, 12, 34, 0.7)' : 'rgba(13, 18, 35, 0.96)',
        backdropFilter: overTechBackground ? 'blur(1px)' : 'blur(14px)',
        WebkitBackdropFilter: overTechBackground ? 'blur(1px)' : 'blur(14px)',
        borderRight: overTechBackground ? '1px solid rgba(96, 136, 255, 0.25)' : '1px solid rgba(99, 102, 241, 0.18)',
      }}
    >
      <SidebarContent />
    </aside>
  )
}

/**
 * Abaixo de 1024px: cabeçalho fixo (logo, estabelecimento e hambúrguer) e
 * menu em drawer sobreposto. Fecha no X, no fundo escuro, num item ou com Esc.
 */
export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const business = getBusinessProfile(user?.businessType)
  const [open, setOpen] = useState(false)

  // Fecha ao trocar de página (inclusive pelo botão voltar do navegador)
  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    // Fecha se a tela crescer para o layout desktop
    const mq = window.matchMedia('(min-width: 1024px)')
    const onResize = () => { if (mq.matches) setOpen(false) }
    document.addEventListener('keydown', onKey)
    mq.addEventListener('change', onResize)
    // Trava a rolagem da página por trás do menu
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onResize)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <header
        className="lg:hidden sticky top-0 z-40 flex items-center gap-3 h-14 px-4 no-print"
        style={{
          background: 'rgba(13, 18, 35, 0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.18)',
        }}
      >
        <Link href="/dashboard" aria-label="Ir para o Dashboard" className="flex-shrink-0">
          <InovasixLogo size="xs" />
        </Link>
        {user && (
          <div className="min-w-0 flex-1 pl-3 border-l border-white/10 leading-tight">
            <p className="text-[10px] uppercase tracking-wider truncate" style={{ color: 'rgba(148, 163, 184, 0.7)' }}>
              {business.label}
            </p>
            <p className="text-sm font-medium text-white truncate">{user.restaurantName}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="ml-auto flex-shrink-0 p-2 -mr-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Menu size={22} />
        </button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 no-print" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={close} />
          <aside
            id="mobile-menu"
            className="absolute inset-y-0 left-0 flex flex-col w-[280px] max-w-[85vw] overflow-y-auto overscroll-contain animate-slide-in-left"
            style={{
              background: 'rgba(13, 18, 35, 0.98)',
              borderRight: '1px solid rgba(99, 102, 241, 0.18)',
              boxShadow: '12px 0 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <SidebarContent onNavigate={close} onClose={close} />
          </aside>
        </div>
      )}
    </>
  )
}
