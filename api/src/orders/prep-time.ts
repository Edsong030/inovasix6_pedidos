/**
 * Tempo de preparo: do recebimento (createdAt) até o pedido ficar pronto (readyAt).
 *
 * Só entram pedidos com cronologia válida:
 *   recebido ≤ início do preparo ≤ pronto ≤ entregue
 * (início do preparo e entrega são conferidos quando existem).
 * Datas faltando, inválidas ou fora de ordem são ignoradas — nunca viram
 * tempo negativo nem zero. A mesma regra existe no frontend (web/lib/prepTime.ts).
 */

type DateLike = Date | string | number | null | undefined;

export interface PrepTimestamps {
  createdAt: DateLike;
  prepStartedAt?: DateLike;
  readyAt?: DateLike;
  deliveredAt?: DateLike;
}

function toMs(value: DateLike): number | null {
  if (value === null || value === undefined || value === '') return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Minutos de preparo do pedido, ou null se faltam horários ou a cronologia é inválida. */
export function prepMinutes(order: PrepTimestamps): number | null {
  const created = toMs(order.createdAt);
  const ready = toMs(order.readyAt);
  if (created === null || ready === null || ready < created) return null;

  const started = toMs(order.prepStartedAt);
  if (started !== null && (started < created || started > ready)) return null;

  const delivered = toMs(order.deliveredAt);
  if (delivered !== null && delivered < ready) return null;

  return (ready - created) / 60000;
}

/** Média em minutos (arredondada) dos pedidos válidos; null quando nenhum é válido. */
export function averagePrepMinutes(orders: PrepTimestamps[]): number | null {
  const times = orders.map(prepMinutes).filter((m): m is number => m !== null);
  if (times.length === 0) return null;
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
}
