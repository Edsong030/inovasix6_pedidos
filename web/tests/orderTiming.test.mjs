// Previsão de pronto — mesma regra da API (api/src/orders/order-timing.spec.ts)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PREP_MINUTES, effectivePrepMinutes, estimateReadyAt, deadlineOf, timingState, timingText, formatDuration, isAwaitingReady,
} from '../lib/orderTiming.ts'

const T0 = Date.parse('2026-09-26T12:00:00Z')
const at = (min) => T0 + min * 60000
const iso = (min) => new Date(at(min)).toISOString()

test('previsão = horário informado (servidor) + tempo médio do negócio', () => {
  assert.equal(estimateReadyAt(T0, 25).getTime(), at(25))
  assert.equal(estimateReadyAt(T0, 45).getTime(), at(45), 'mudar o tempo médio muda só os novos pedidos')
})

test('tempo inválido usa o padrão explícito', () => {
  for (const v of [null, undefined, 0, -5, 241, 12.5, '30', Number.NaN]) {
    assert.equal(effectivePrepMinutes(v), DEFAULT_PREP_MINUTES, String(v))
  }
  assert.equal(estimateReadyAt(T0, null).getTime(), at(DEFAULT_PREP_MINUTES))
})

test('encomenda: previsão é o horário combinado', () => {
  assert.equal(estimateReadyAt(T0, 25, iso(180)).getTime(), at(180))
})

test('pedido antigo sem previsão: criação + tempo configurado', () => {
  assert.equal(deadlineOf({ createdAt: iso(0) }, 20).getTime(), at(20))
  assert.equal(deadlineOf({ createdAt: iso(0), estimatedReadyAt: iso(40) }, 20).getTime(), at(40))
})

test('no prazo, próximo do prazo e atrasado', () => {
  const order = { createdAt: iso(0), estimatedReadyAt: iso(30) }
  const onTime = timingState(order, 30, at(10))
  assert.deepEqual([onTime.state, onTime.minutesLeft, onTime.minutesLate], ['on_time', 20, 0])
  assert.equal(timingText(onTime), 'faltam 20 min')

  const soon = timingState(order, 30, at(26))
  assert.deepEqual([soon.state, soon.minutesLeft], ['due_soon', 4])
  assert.equal(timingText(soon), 'faltam 4 min')

  const late = timingState(order, 30, at(38))
  assert.deepEqual([late.state, late.minutesLate, late.minutesLeft], ['late', 8, 0])
  assert.equal(timingText(late), '8 min atrasado')
})

test('encomenda fica "próxima do prazo" 1h antes', () => {
  const pre = { createdAt: iso(0), scheduledFor: iso(180), estimatedReadyAt: iso(180) }
  assert.equal(timingState(pre, 30, at(100)).state, 'on_time')
  assert.equal(timingState(pre, 30, at(130)).state, 'due_soon')
  assert.equal(timingText(timingState(pre, 30, at(0))), 'faltam 3 h')
})

test('formatação e status que correm contra o prazo', () => {
  assert.equal(formatDuration(65), '1 h 05 min')
  assert.equal(formatDuration(8), '8 min')
  assert.ok(isAwaitingReady('RECEIVED') && isAwaitingReady('PREPARING'))
  assert.ok(!isAwaitingReady('READY') && !isAwaitingReady('DELIVERED') && !isAwaitingReady('CANCELLED'))
})
