/**
 * Tempo de preparo: do recebimento (createdAt) até o pedido ficar pronto (readyAt).
 *
 * Só entram pedidos com cronologia válida:
 *   recebido ≤ início do preparo ≤ pronto ≤ entregue
 * (início do preparo e entrega são conferidos quando existem).
 * Pedido com datas faltando, inválidas ou fora de ordem é ignorado — nunca
 * vira tempo negativo nem zero. A mesma regra existe na API (api/src/orders/prep-time.ts).
 *
 * Sem dependências: testado direto com `node --test` (web/tests).
 */

type DateLike = string | number | Date | null | undefined

export interface PrepTimestamps {
  createdAt: DateLike
  prepStartedAt?: DateLike
  readyAt?: DateLike
  deliveredAt?: DateLike
}

function toMs(value: DateLike): number | null {
  if (value === null || value === undefined || value === '') return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

/** Minutos de preparo do pedido, ou null se faltam horários ou a cronologia é inválida. */
export function prepMinutes(order: PrepTimestamps): number | null {
  const created = toMs(order.createdAt)
  const ready   = toMs(order.readyAt)
  if (created === null || ready === null || ready < created) return null

  const started = toMs(order.prepStartedAt)
  if (started !== null && (started < created || started > ready)) return null

  const delivered = toMs(order.deliveredAt)
  if (delivered !== null && delivered < ready) return null

  return (ready - created) / 60000
}

/** Média (em minutos, sem arredondar) dos pedidos válidos; null quando nenhum é válido. */
export function averagePrepMinutes(orders: PrepTimestamps[]): number | null {
  const times: number[] = []
  for (const o of orders) {
    const m = prepMinutes(o)
    if (m !== null) times.push(m)
  }
  if (times.length === 0) return null
  return times.reduce((a, b) => a + b, 0) / times.length
}

/** "27 min", "< 1 min" ou "—" (sem dados válidos). Nunca "0 min" nem negativo. */
export function formatPrepMinutes(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return '—'
  if (minutes < 1) return '< 1 min'
  return `${Math.round(minutes)} min`
}
