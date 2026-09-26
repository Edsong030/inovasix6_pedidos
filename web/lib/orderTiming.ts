/**
 * Previsão de pronto dos pedidos — mesma regra da API (api/src/orders/order-timing.ts).
 * Na API a previsão é gravada pelo servidor ao criar o pedido; na demo, pelo store local.
 * Sem dependências: testado direto com `node --test` (web/tests).
 */

/** Usado quando a configuração do negócio não tem um tempo válido. */
export const DEFAULT_PREP_MINUTES = 30
export const MIN_PREP_MINUTES = 1
export const MAX_PREP_MINUTES = 240
/** Minutos antes da previsão em que o pedido passa a "próximo do prazo". */
export const DUE_SOON_MINUTES = 5
/** Encomendas: alerta 1h antes da retirada/entrega. */
export const PREORDER_DUE_SOON_MINUTES = 60

type DateLike = string | number | Date | null | undefined

export interface TimedOrder {
  createdAt: DateLike
  estimatedReadyAt?: DateLike
  scheduledFor?: DateLike
  status?: string
}

export type TimingState = 'on_time' | 'due_soon' | 'late'

export interface Timing {
  deadline: Date
  state: TimingState
  /** Minutos até a previsão (0 quando já passou) */
  minutesLeft: number
  /** Minutos de atraso (0 quando no prazo) */
  minutesLate: number
}

const toMs = (v: DateLike): number | null => {
  if (v === null || v === undefined || v === '') return null
  const ms = new Date(v).getTime()
  return Number.isFinite(ms) ? ms : null
}

export function effectivePrepMinutes(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_PREP_MINUTES && value <= MAX_PREP_MINUTES
    ? value
    : DEFAULT_PREP_MINUTES
}

/** Previsão ao criar: encomenda → horário combinado; senão agora + tempo médio. */
export function estimateReadyAt(nowMs: number, prepMinutes: unknown, scheduledFor?: DateLike): Date {
  const scheduled = toMs(scheduledFor)
  if (scheduled !== null) return new Date(scheduled)
  return new Date(nowMs + effectivePrepMinutes(prepMinutes) * 60000)
}

/** Prazo do pedido; pedidos antigos sem previsão usam criação + tempo configurado. */
export function deadlineOf(order: TimedOrder, prepMinutes: unknown): Date {
  const est = toMs(order.estimatedReadyAt)
  if (est !== null) return new Date(est)
  const scheduled = toMs(order.scheduledFor)
  if (scheduled !== null) return new Date(scheduled)
  return estimateReadyAt(toMs(order.createdAt) ?? Date.now(), prepMinutes)
}

export function timingState(order: TimedOrder, prepMinutes: unknown, nowMs: number): Timing {
  const deadline = deadlineOf(order, prepMinutes)
  const diffMin = (deadline.getTime() - nowMs) / 60000
  const soon = toMs(order.scheduledFor) !== null ? PREORDER_DUE_SOON_MINUTES : DUE_SOON_MINUTES
  return {
    deadline,
    state: diffMin < 0 ? 'late' : diffMin <= soon ? 'due_soon' : 'on_time',
    minutesLeft: Math.max(0, Math.ceil(diffMin)),
    minutesLate: diffMin < 0 ? Math.floor(-diffMin) : 0,
  }
}

/** Só pedidos recebidos ou em preparo ainda correm contra a previsão. */
export const isAwaitingReady = (status?: string) => status === 'RECEIVED' || status === 'PREPARING'

/** "8 min", "1 h 05 min" */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h} h ${String(rest).padStart(2, '0')} min` : `${h} h`
}

/** "14:35" no mesmo dia; "27/09 14:35" em outro dia. */
export function formatDeadline(deadline: Date, nowMs: number): string {
  const time = deadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const sameDay = new Date(nowMs).toDateString() === deadline.toDateString()
  return sameDay ? time : `${deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`
}

/** Texto curto da situação: "faltam 12 min", "faltam 3 min" (próximo) ou "8 min atrasado". */
export function timingText(t: Timing): string {
  if (t.state === 'late') return t.minutesLate < 1 ? 'atrasado' : `${formatDuration(t.minutesLate)} atrasado`
  return t.minutesLeft < 1 ? 'vence agora' : `faltam ${formatDuration(t.minutesLeft)}`
}
