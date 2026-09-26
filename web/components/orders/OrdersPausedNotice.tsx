'use client'

import Link from 'next/link'
import { CirclePause, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

/** true quando o negócio pausou o recebimento de pedidos em Configurações. */
export function useOrdersPaused(): boolean {
  const { settings } = useSettings()
  return !!settings && !settings.acceptingOrders
}

export const PAUSED_TITLE = 'Recebimento de pedidos pausado'

/** Aviso exibido no lugar da ação de novo pedido. Admin/Gerente veem o atalho para reativar. */
export function OrdersPausedNotice({ className }: { className?: string }) {
  const { user } = useAuth()
  const paused = useOrdersPaused()
  if (!paused) return null
  const canReactivate = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  return (
    <div role="status" className={cn('flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] px-4 py-3', className)}>
      <CirclePause size={20} className="text-amber-300 flex-shrink-0" />
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-semibold text-amber-200">{PAUSED_TITLE}</p>
        <p className="text-xs text-amber-200/70">
          {canReactivate
            ? 'Novos pedidos estão bloqueados. Reative em Configurações → Operação.'
            : 'Novos pedidos estão bloqueados. Peça a um administrador ou gerente para reativar.'}
        </p>
      </div>
      {canReactivate && (
        <Link href="/settings" className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/10 transition-colors whitespace-nowrap">
          Reativar <ChevronRight size={14} />
        </Link>
      )}
    </div>
  )
}
