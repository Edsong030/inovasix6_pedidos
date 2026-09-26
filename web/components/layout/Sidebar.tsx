'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, ChefHat, Table2,
  UtensilsCrossed, BarChart3, Users, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { InovasixLogo } from '@/components/brand/InovasixLogo'
import type { UserRole } from '@/types'

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

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Dashboard e Relatórios: sidebar levemente translúcida sobre o fundo tecnológico
  const overTechBackground = ['/dashboard', '/reports'].some(p => pathname.startsWith(p))

  const visible = NAV.filter(
    (n) => !n.roles || (user && n.roles.includes(user.role)),
  )

  return (
    <aside
      className="flex flex-col h-screen sticky top-0"
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

      {/* ── Área de marca ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center"
        style={{
          minHeight: 88,
          padding: '12px 16px',
          borderBottom: '1px solid rgba(99, 102, 241, 0.12)',
        }}
      >
        <InovasixLogo variant="sidebar" />
      </div>

      {/* Restaurante */}
      {user && (
        <div
          className="px-5 py-3"
          style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.12)' }}
        >
          <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(148, 163, 184, 0.7)' }}>
            Restaurante
          </p>
          <p className="text-sm font-medium text-white truncate mt-0.5">{user.restaurantName}</p>
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
    </aside>
  )
}
