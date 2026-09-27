import { BadRequestException } from '@nestjs/common';
import { OrderChannel, OrderStatus } from '@prisma/client';

/**
 * Validação dos parâmetros de query dos relatórios. Erro de entrada vira 400 com
 * mensagem clara (nunca chega ao Prisma como data inválida, o que resultaria em 500).
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function parseDay(value: unknown, label: string): string {
  if (value === undefined || value === null || value === '') {
    throw new BadRequestException(`Informe a ${label} no formato AAAA-MM-DD`);
  }
  if (typeof value !== 'string' || !DAY.test(value)) {
    throw new BadRequestException(`${cap(label)} inválida: use o formato AAAA-MM-DD`);
  }
  // Rejeita datas inexistentes (ex.: 2026-02-30), que o Date "corrigiria" para outro dia
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`${cap(label)} inexistente: ${value}`);
  }
  return value;
}

/** startDate e endDate obrigatórios, válidos e em ordem (início ≤ fim). */
export function parseSalesRange(startDate: unknown, endDate: unknown) {
  const start = parseDay(startDate, 'data inicial (startDate)');
  const end = parseDay(endDate, 'data final (endDate)');
  if (start > end) throw new BadRequestException('Intervalo inválido: a data inicial é posterior à data final');
  return { startDate: start, endDate: end };
}

function parsePositiveInt(value: unknown, label: string, fallback: number, max: number): number {
  if (value === undefined || value === '') return fallback;
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new BadRequestException(`${label} inválido: use um número inteiro entre 1 e ${max}`);
  }
  return n;
}

function parseEnum<T extends string>(value: unknown, values: Record<string, T>, label: string): T | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !(Object.values(values) as string[]).includes(value)) {
    throw new BadRequestException(`${label} inválido. Valores aceitos: ${Object.values(values).join(', ')}`);
  }
  return value as T;
}

export function parseHistoryParams(q: { page?: unknown; limit?: unknown; status?: unknown; channel?: unknown }) {
  return {
    page: parsePositiveInt(q.page, 'page', 1, 100_000),
    limit: parsePositiveInt(q.limit, 'limit', 20, 200),
    status: parseEnum(q.status, OrderStatus, 'status'),
    channel: parseEnum(q.channel, OrderChannel, 'channel'),
  };
}
