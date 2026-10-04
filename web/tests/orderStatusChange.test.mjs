// Mudança normal de status (Pedidos e Cozinha) com HTTP 409 da API (alteração concorrente).
// Regra em lib/orderStatusChange.ts; ligação com as telas conferida no código-fonte
// (como em login-form.test.mjs e orderCancellation.test.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STATUS_CONFLICT_MESSAGE, applyStatusChange, isStatusConflict } from '../lib/orderStatusChange.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (file) => readFileSync(join(root, file), 'utf8')
const httpError = (status, message) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data: { message } } })

/** Simula a tela: conta envios, sucessos, conflitos e recargas. */
function screen(outcome) {
  const log = { sends: 0, success: 0, conflict: 0, reloads: 0 }
  const send = async () => {
    log.sends++
    if (outcome) throw outcome
    return { data: { status: 'PREPARING' } }
  }
  const handlers = {
    onSuccess: () => { log.success++; log.reloads++ },
    onConflict: () => { log.conflict++; log.reloads++ },
  }
  return { log, run: () => applyStatusChange(send, handlers) }
}

test('mensagem de conflito', () => {
  assert.equal(STATUS_CONFLICT_MESSAGE, 'O pedido foi atualizado por outra operação. Os dados foram recarregados.')
})

test('status normal com sucesso continua funcionando (sucesso + recarga)', async () => {
  const { log, run } = screen()
  await run()
  assert.deepEqual(log, { sends: 1, success: 1, conflict: 0, reloads: 1 })
})

test('409: não exibe sucesso, exibe conflito, recarrega e não repete a mudança', async () => {
  const { log, run } = screen(httpError(409, 'O pedido foi alterado por outra operação.'))
  await run() // não lança: o conflito é tratado
  assert.equal(log.success, 0, 'sem mensagem de sucesso')
  assert.equal(log.conflict, 1, 'mensagem de conflito')
  assert.equal(log.reloads, 1, 'dados recarregados')
  assert.equal(log.sends, 1, 'sem retry automático')
  assert.equal(isStatusConflict(httpError(409)), true)
})

test('400, 403, 404 e falha de rede seguem o tratamento anterior (relançados, sem virar 409)', async () => {
  for (const err of [httpError(400, 'Transição inválida'), httpError(403), httpError(404), new Error('Network Error')]) {
    const { log, run } = screen(err)
    await assert.rejects(run(), (e) => e === err)
    assert.deepEqual(log, { sends: 1, success: 0, conflict: 0, reloads: 0 })
    assert.equal(isStatusConflict(err), false)
  }
})

/** O handler da tela usa applyStatusChange: sucesso preservado; 409 → toast de conflito + load(). */
function assertScreenHandles409(file, handler, successToast) {
  const code = src(file)
  // Handler da página (assinatura exata), até a linha em branco seguinte
  const signature = `const ${handler} = (orderId: string, status: string) =>`
  const start = code.indexOf(signature)
  assert.ok(start >= 0, `${handler} da página existe`)
  const body = code.slice(start, code.indexOf('\n\n', start))
  assert.match(code, /import \{ STATUS_CONFLICT_MESSAGE, applyStatusChange \} from '@\/lib\/orderStatusChange'/)
  assert.match(body, /applyStatusChange\(\(\) => dataApi\.updateOrderStatus\(orderId, status\)/)
  assert.match(body, /onConflict: \(\) => \{\s*toast\.error\(STATUS_CONFLICT_MESSAGE\)\s*load\(\)/)
  assert.match(body, new RegExp(`onSuccess: \\(\\) => \\{\\s*toast\\.success\\(${successToast}`))
  // o toast de sucesso só aparece dentro de onSuccess
  assert.equal((body.match(/toast\.success/g) ?? []).length, 1)
}

test('Pedidos trata 409 (avançar status no OrderCard)', () => {
  assertScreenHandles409('app/(dashboard)/orders/page.tsx', 'handleStatusChange', '`Status atualizado')
  assert.match(src('app/(dashboard)/orders/page.tsx'), /onStatusChange=\{handleStatusChange\}/)
})

test('Cozinha trata 409 (iniciar preparo / marcar pronto)', () => {
  assertScreenHandles409('app/(dashboard)/kitchen/page.tsx', 'handleAdvance', "status === 'READY'")
  assert.match(src('app/(dashboard)/kitchen/page.tsx'), /onAdvance=\{handleAdvance\}/)
})

test('demo continua igual: updateOrderStatus usa o store local e o fluxo é o mesmo', async () => {
  const api = src('hooks/useApi.ts')
  assert.match(api, /updateOrderStatus: \(id: string, status: string\) =>\s*IS_DEMO\s*\?\s*ok\(demoStore\.updateOrderStatus\(id, status as OrderStatus\)\)/)
  // No store local a promessa resolve: sucesso normal, nunca conflito
  const { log, run } = screen()
  await run()
  assert.equal(log.success, 1)
})

test('cancelamento mantém o tratamento próprio (não passa por applyStatusChange)', () => {
  const page = src('app/(dashboard)/orders/page.tsx')
  assert.match(page, /submitCancellation\(cancelling\.id, reason, dataApi\.cancelOrder\)/)
  assert.match(page, /if \(result\.kind === 'conflict'\) \{\s*setCancelling\(null\)\s*load\(\)/)
  assert.doesNotMatch(page, /applyStatusChange\([^)]*cancelOrder/)
  assert.match(src('lib/orderCancellation.ts'), /ORDER_CONFLICT_MESSAGE = 'O pedido foi atualizado por outra operação\. Os dados serão recarregados\.'/)
})
