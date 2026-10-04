/**
 * Cancelamento de pedido: motivo obrigatório (mesma regra da API em
 * PATCH /orders/:id/status com status = CANCELLED) e tratamento das respostas.
 * Sem dependências de React nem de alias "@/": testado direto pelo node:test.
 */

export const CANCEL_REASON_MAX = 500
export const CANCEL_REASON_REQUIRED = 'Informe o motivo do cancelamento'
export const CANCEL_REASON_TOO_LONG = `O motivo pode ter no máximo ${CANCEL_REASON_MAX} caracteres`
export const ORDER_CONFLICT_MESSAGE = 'O pedido foi atualizado por outra operação. Os dados serão recarregados.'
const CANCEL_FAILED = 'Não foi possível cancelar o pedido'

/** Problema do motivo (já considerando o trim) ou null se válido. */
export function cancelReasonProblem(raw: string): string | null {
  const reason = (raw ?? '').trim()
  if (!reason) return CANCEL_REASON_REQUIRED
  if (reason.length > CANCEL_REASON_MAX) return CANCEL_REASON_TOO_LONG
  return null
}

export interface CancelPayload {
  status: 'CANCELLED'
  reason: string
}

/** Corpo do PATCH: só o cancelamento leva motivo (já aparado). */
export function cancelPayload(raw: string): CancelPayload {
  return { status: 'CANCELLED', reason: raw.trim() }
}

export type CancelResult =
  | { ok: true }
  | { ok: false; kind: 'invalid' | 'bad_request' | 'conflict' | 'error'; message: string }

type ApiError = { response?: { status?: number; data?: { message?: string | string[] } } }

function apiMessage(err: unknown): string | undefined {
  const msg = (err as ApiError)?.response?.data?.message
  return (Array.isArray(msg) ? msg[0] : msg) || undefined
}

/**
 * Valida e envia o cancelamento. `send` é a chamada real (API ou store da demo).
 *  • 409: outra operação alterou o pedido antes → recarregar os dados;
 *  • 400: mensagem da API (ex.: motivo inválido, transição já não permitida);
 *  • demais: mensagem da API ou genérica.
 */
export async function submitCancellation(
  orderId: string,
  rawReason: string,
  send: (orderId: string, payload: CancelPayload) => Promise<unknown>,
): Promise<CancelResult> {
  const problem = cancelReasonProblem(rawReason)
  if (problem) return { ok: false, kind: 'invalid', message: problem }
  try {
    await send(orderId, cancelPayload(rawReason))
    return { ok: true }
  } catch (err) {
    const status = (err as ApiError)?.response?.status
    if (status === 409) return { ok: false, kind: 'conflict', message: ORDER_CONFLICT_MESSAGE }
    if (status === 400) return { ok: false, kind: 'bad_request', message: apiMessage(err) ?? CANCEL_FAILED }
    return { ok: false, kind: 'error', message: apiMessage(err) ?? CANCEL_FAILED }
  }
}
