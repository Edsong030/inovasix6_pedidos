'use client'

import { Timer, TriangleAlert, CircleCheck } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import { formatDeadline, isAwaitingReady, timingState, timingText, type Timing, type TimedOrder } from '@/lib/orderTiming'

/** Situação de prazo do pedido no horário `now` (do servidor). */
export function useOrderTiming() {
  const { settings } = useSettings()
  return (order: TimedOrder, now: number): Timing | null =>
    isAwaitingReady(order.status) ? timingState(order, settings?.avgPrepMinutes, now) : null
}

export const TIMING_STYLE = {
  on_time:  { pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25', text: 'text-emerald-300', icon: CircleCheck },
  due_soon: { pill: 'bg-amber-500/15 text-amber-200 border-amber-400/30',       text: 'text-amber-300',   icon: Timer },
  late:     { pill: 'bg-red-500/15 text-red-300 border-red-400/30',             text: 'text-red-300',     icon: TriangleAlert },
} as const

/** Pílula com "faltam X min" / "X min atrasado". */
export function TimingPill({ timing, className }: { timing: Timing; className?: string }) {
  const s = TIMING_STYLE[timing.state]
  const Icon = s.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap', s.pill, className)}>
      <Icon size={12} /> {timingText(timing)}
    </span>
  )
}

/** Linha "Pronto previsto para 14:35" + pílula. Não aparece para pedidos já prontos/encerrados. */
export function OrderTimingLine({ order, now, className }: { order: TimedOrder; now: number; className?: string }) {
  const getTiming = useOrderTiming()
  const timing = getTiming(order, now)
  if (!timing) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs', className)}>
      <span className="text-gray-400">Pronto previsto para <span className="font-medium text-gray-200">{formatDeadline(timing.deadline, now)}</span></span>
      <TimingPill timing={timing} />
    </div>
  )
}
