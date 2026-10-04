// Cancelamento de pedido com motivo obrigatório (API: PATCH /orders/:id/status com
// status = CANCELLED exige reason). Regras e respostas: lib/orderCancellation.ts.
// A ligação com as telas é conferida no código-fonte (como em login-form.test.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CANCEL_REASON_MAX, CANCEL_REASON_REQUIRED, CANCEL_REASON_TOO_LONG, ORDER_CONFLICT_MESSAGE,
  cancelReasonProblem, cancelPayload, submitCancellation,
} from '../lib/orderCancellation.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (file) => readFileSync(join(root, file), 'utf8')

/** `send` falso que registra as chamadas e devolve o que for configurado. */
function fakeSend(outcome = 'ok') {
  const calls = []
  const send = async (id, payload) => {
    calls.push({ id, payload })
    if (outcome === 'ok') return { data: { id, status: 'CANCELLED' } }
    throw outcome
  }
  return { send, calls }
}
const httpError = (status, message) => ({ response: { status, data: { message } } })

test('1. tela: o botão de cancelar abre o modal (sem confirm() nem chamada direta à API)', () => {
  const card = src('components/orders/OrderCard.tsx')
  assert.doesNotMatch(card, /confirm\(/, 'OrderCard não usa mais window.confirm')
  assert.doesNotMatch(card, /prompt\(/)
  assert.match(card, /const handleCancel = \(\) => onCancel\(order\)/)
  assert.match(card, /aria-label="Cancelar pedido"/)

  const page = src('app/(dashboard)/orders/page.tsx')
  assert.match(page, /const handleCancel = \(order: Order\) => setCancelling\(order\)/)
  assert.match(page, /<CancelOrderModal/)
  assert.doesNotMatch(page, /updateOrderStatus\([^)]*'CANCELLED'/, 'cancelamento nunca sai sem motivo')

  const modal = src('components/orders/CancelOrderModal.tsx')
  assert.match(modal, /title="Cancelar pedido"/)
  assert.match(modal, /Informe o motivo do cancelamento\./)
  assert.match(modal, /Motivo do cancelamento/)
  assert.match(modal, /<textarea/)
  assert.match(modal, /disabled=\{!!problem \|\| submitting\}/, 'confirmar desabilitado com motivo inválido')
})

test('2. motivo vazio não permite confirmar nem envia', async () => {
  assert.equal(cancelReasonProblem(''), CANCEL_REASON_REQUIRED)
  const { send, calls } = fakeSend()
  const r = await submitCancellation('p1', '', send)
  assert.deepEqual(r, { ok: false, kind: 'invalid', message: CANCEL_REASON_REQUIRED })
  assert.equal(calls.length, 0)
})

test('3. somente espaços (inclusive quebras de linha) não permite confirmar', async () => {
  for (const blank of ['   ', '\n\t  \n']) {
    assert.equal(cancelReasonProblem(blank), CANCEL_REASON_REQUIRED)
    const { send, calls } = fakeSend()
    assert.equal((await submitCancellation('p1', blank, send)).ok, false)
    assert.equal(calls.length, 0)
  }
})

test('4. mais de 500 caracteres não é aceito (500 sim; o trim conta)', async () => {
  assert.equal(CANCEL_REASON_MAX, 500)
  assert.equal(cancelReasonProblem('x'.repeat(501)), CANCEL_REASON_TOO_LONG)
  assert.equal(cancelReasonProblem('x'.repeat(500)), null)
  assert.equal(cancelReasonProblem(`  ${'x'.repeat(500)}  `), null)
  const { send, calls } = fakeSend()
  assert.equal((await submitCancellation('p1', 'x'.repeat(501), send)).kind, 'invalid')
  assert.equal(calls.length, 0)
})

test('5. motivo válido envia { status: "CANCELLED", reason } com trim', async () => {
  assert.deepEqual(cancelPayload('  Cliente desistiu  '), { status: 'CANCELLED', reason: 'Cliente desistiu' })
  const { send, calls } = fakeSend()
  await submitCancellation('pedido-42', '  Cliente desistiu  ', send)
  assert.deepEqual(calls, [{ id: 'pedido-42', payload: { status: 'CANCELLED', reason: 'Cliente desistiu' } }])
})

test('6. sucesso: resultado ok; a página fecha o modal, avisa e recarrega', async () => {
  const { send } = fakeSend()
  assert.deepEqual(await submitCancellation('p1', 'Item em falta', send), { ok: true })
  const page = src('app/(dashboard)/orders/page.tsx')
  assert.match(page, /if \(result\.ok\) \{\s*toast\.success\('Pedido cancelado'\)\s*setCancelling\(null\)\s*load\(\)/)
})

test('7. HTTP 400: mensagem da API (lista ou texto) e o modal continua aberto', async () => {
  let r = await submitCancellation('p1', 'Motivo', fakeSend(httpError(400, ['Informe o motivo do cancelamento', 'outra'])).send)
  assert.deepEqual(r, { ok: false, kind: 'bad_request', message: 'Informe o motivo do cancelamento' })
  r = await submitCancellation('p1', 'Motivo', fakeSend(httpError(400, 'Transição inválida: DELIVERED → CANCELLED')).send)
  assert.equal(r.message, 'Transição inválida: DELIVERED → CANCELLED')
  r = await submitCancellation('p1', 'Motivo', fakeSend(httpError(400)).send)
  assert.equal(r.message, 'Não foi possível cancelar o pedido')
  // Página: mensagem vai para o modal (return result.message)
  assert.match(src('app/(dashboard)/orders/page.tsx'), /return result\.message/)
})

test('8. HTTP 409: mensagem clara e a página recarrega os dados', async () => {
  const r = await submitCancellation('p1', 'Motivo', fakeSend(httpError(409, 'O pedido foi alterado por outra operação.')).send)
  assert.deepEqual(r, { ok: false, kind: 'conflict', message: ORDER_CONFLICT_MESSAGE })
  assert.equal(ORDER_CONFLICT_MESSAGE, 'O pedido foi atualizado por outra operação. Os dados serão recarregados.')
  const page = src('app/(dashboard)/orders/page.tsx')
  assert.match(page, /toast\.error\(result\.message\)/, '409 não é silenciado')
  assert.match(page, /if \(result\.kind === 'conflict'\) \{\s*setCancelling\(null\)\s*load\(\)/)
})

test('outros erros: mensagem da API ou genérica (rede sem resposta)', async () => {
  assert.deepEqual(
    await submitCancellation('p1', 'Motivo', fakeSend(httpError(403, 'Seu perfil não pode levar este pedido a este status')).send),
    { ok: false, kind: 'error', message: 'Seu perfil não pode levar este pedido a este status' },
  )
  assert.deepEqual(
    await submitCancellation('p1', 'Motivo', fakeSend(new Error('Network Error')).send),
    { ok: false, kind: 'error', message: 'Não foi possível cancelar o pedido' },
  )
})

test('9. outras mudanças de status continuam iguais (sem reason)', () => {
  const api = src('hooks/useApi.ts')
  assert.match(api, /updateOrderStatus: \(id: string, status: string\) =>[\s\S]*?api\.patch\(`\/orders\/\$\{id\}\/status`, \{ status \}\)/)
  assert.match(api, /cancelOrder: \(id: string, payload: CancelPayload\) =>[\s\S]*?api\.patch\(`\/orders\/\$\{id\}\/status`, payload\)/)
  // Pedidos (avançar) e Cozinha continuam usando updateOrderStatus, sem motivo
  assert.match(src('app/(dashboard)/orders/page.tsx'), /dataApi\.updateOrderStatus\(orderId, status\)/)
  assert.match(src('app/(dashboard)/kitchen/page.tsx'), /dataApi\.updateOrderStatus\(orderId, status\)/)
  assert.doesNotMatch(src('app/(dashboard)/kitchen/page.tsx'), /CANCELLED'\)|reason/)
})

test('10. demo: cancela no store local, sem chamar a API, pelo mesmo modal', async () => {
  const api = src('hooks/useApi.ts')
  const block = api.slice(api.indexOf('cancelOrder:'), api.indexOf('// Kitchen'))
  assert.match(block, /IS_DEMO\s*\?\s*ok\(demoStore\.updateOrderStatus\(id, 'CANCELLED'\)\)/)
  // O fluxo (validação + envio) é o mesmo: com um "send" local que resolve, o resultado é ok
  const local = fakeSend()
  assert.deepEqual(await submitCancellation('demo-1', 'Teste na demo', local.send), { ok: true })
  assert.equal(local.calls[0].payload.reason, 'Teste na demo')
})
