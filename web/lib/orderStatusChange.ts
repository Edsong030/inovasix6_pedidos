/**
 * Mudança normal de status (avançar) nas telas de Pedidos e Cozinha.
 * A API responde 409 quando outra operação mudou o pedido antes (gravação condicional):
 * aqui o 409 vira aviso + recarga dos dados, sem sucesso e sem repetir a mudança — repetir
 * poderia executar uma transição que a pessoa já não pretende fazer.
 * Os demais erros seguem o tratamento que já existia (são relançados).
 * Sem dependências de React nem de alias "@/": testado direto pelo node:test.
 */

export const STATUS_CONFLICT_MESSAGE = 'O pedido foi atualizado por outra operação. Os dados foram recarregados.'

export function isStatusConflict(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 409
}

/**
 * Executa `send` uma única vez.
 *  • sucesso → onSuccess (toast de sucesso + recarga, como antes);
 *  • 409     → onConflict (toast de conflito + recarga), sem sucesso e sem retry;
 *  • outros  → relançado sem alteração.
 */
export async function applyStatusChange(
  send: () => Promise<unknown>,
  handlers: { onSuccess: () => void; onConflict: () => void },
): Promise<void> {
  try {
    await send()
  } catch (err) {
    if (isStatusConflict(err)) {
      handlers.onConflict()
      return
    }
    throw err
  }
  handlers.onSuccess()
}
