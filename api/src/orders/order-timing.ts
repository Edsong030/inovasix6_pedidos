/**
 * Previsão de pronto dos pedidos. Sempre calculada com o relógio do servidor.
 * A mesma regra existe no frontend (web/lib/orderTiming.ts), usada na demo.
 */

/** Usado quando a configuração do negócio não tem um tempo válido. */
export const DEFAULT_PREP_MINUTES = 30;
export const MIN_PREP_MINUTES = 1;
export const MAX_PREP_MINUTES = 240;

/** Minutos antes da previsão em que o pedido passa a "próximo do prazo". */
export const DUE_SOON_MINUTES = 5;
/** Encomendas: alerta 1h antes da retirada/entrega. */
export const PREORDER_DUE_SOON_MINUTES = 60;

/** Tempo configurado, ou o padrão seguro quando ausente/fora do intervalo. */
export function effectivePrepMinutes(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_PREP_MINUTES && value <= MAX_PREP_MINUTES
    ? value
    : DEFAULT_PREP_MINUTES;
}

/** Previsão ao criar o pedido: encomenda → horário combinado; senão agora + tempo médio. */
export function estimateReadyAt(now: Date, prepMinutes: unknown, scheduledFor?: Date | null): Date {
  if (scheduledFor) return scheduledFor;
  return new Date(now.getTime() + effectivePrepMinutes(prepMinutes) * 60000);
}

interface TimedOrder {
  createdAt: Date;
  estimatedReadyAt?: Date | null;
  scheduledFor?: Date | null;
}

/** Prazo do pedido (pedidos antigos sem previsão usam criação + tempo configurado). */
export function deadlineOf(order: TimedOrder, prepMinutes: unknown): Date {
  return order.estimatedReadyAt ?? order.scheduledFor ?? estimateReadyAt(order.createdAt, prepMinutes);
}

export type TimingState = 'on_time' | 'due_soon' | 'late';

export function timingState(order: TimedOrder, prepMinutes: unknown, nowMs: number) {
  const deadline = deadlineOf(order, prepMinutes);
  const diffMin = (deadline.getTime() - nowMs) / 60000;
  const soon = order.scheduledFor ? PREORDER_DUE_SOON_MINUTES : DUE_SOON_MINUTES;
  const state: TimingState = diffMin < 0 ? 'late' : diffMin <= soon ? 'due_soon' : 'on_time';
  return {
    deadline,
    state,
    /** Minutos até a previsão (0 quando já passou) */
    minutesLeft: Math.max(0, Math.ceil(diffMin)),
    /** Minutos de atraso (0 quando no prazo) */
    minutesLate: diffMin < 0 ? Math.floor(-diffMin) : 0,
  };
}
