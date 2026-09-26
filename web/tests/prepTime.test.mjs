// Tempo médio de preparo — regressão do "Tempo médio negativo".
// Rodar: npm test (node --test; o Node carrega os .ts direto, sem compilar)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prepMinutes, averagePrepMinutes, formatPrepMinutes } from '../lib/prepTime.ts'
import { SNACK_BAR_DEMO, CONFECTIONERY_DEMO, JAPANESE_DEMO } from '../lib/demo/businesses.ts'

const T0 = Date.parse('2026-09-26T12:00:00Z')
const at = (min) => new Date(T0 + min * 60000).toISOString()

test('pedido válido: minutos do recebimento até pronto', () => {
  assert.equal(prepMinutes({ createdAt: at(0), prepStartedAt: at(3), readyAt: at(25), deliveredAt: at(30) }), 25)
  assert.equal(prepMinutes({ createdAt: at(0), readyAt: at(12) }), 12, 'início do preparo é opcional')
})

test('datas inválidas nunca geram tempo (nem negativo)', () => {
  const invalid = [
    { createdAt: at(0), readyAt: at(-40) },                                   // pronto antes de recebido (caso do seed)
    { createdAt: at(0), prepStartedAt: at(-5), readyAt: at(20) },             // preparo antes de recebido
    { createdAt: at(0), prepStartedAt: at(30), readyAt: at(20) },             // preparo depois de pronto
    { createdAt: at(0), readyAt: at(20), deliveredAt: at(10) },               // entregue antes de pronto
    { createdAt: at(0), readyAt: null },                                      // sem horário de pronto
    { createdAt: at(0) },                                                     // idem
    { createdAt: null, readyAt: at(10) },                                     // sem recebimento
    { createdAt: 'data-invalida', readyAt: at(10) },                          // data ilegível
    { createdAt: at(0), readyAt: 'nao-e-data' },
  ]
  for (const o of invalid) assert.equal(prepMinutes(o), null, JSON.stringify(o))
  assert.equal(averagePrepMinutes(invalid), null, 'só inválidos → sem dados')
})

test('média ignora os inválidos e usa apenas os válidos', () => {
  const orders = [
    { createdAt: at(0), prepStartedAt: at(2), readyAt: at(20) },   // 20
    { createdAt: at(0), prepStartedAt: at(5), readyAt: at(30) },   // 30
    { createdAt: at(0), readyAt: at(-40) },                        // inválido (seria −40)
    { createdAt: at(0), readyAt: null },                           // sem dados
  ]
  assert.equal(averagePrepMinutes(orders), 25)
  const avg = averagePrepMinutes(orders)
  assert.ok(avg !== null && avg >= 0)
})

test('lista vazia → sem dados (null), nunca 0', () => {
  assert.equal(averagePrepMinutes([]), null)
})

test('exibição: "—" sem dados, "< 1 min" abaixo de 1 minuto, nunca "0 min" ou negativo', () => {
  assert.equal(formatPrepMinutes(null), '—')
  assert.equal(formatPrepMinutes(-21), '—')
  assert.equal(formatPrepMinutes(Number.NaN), '—')
  assert.equal(formatPrepMinutes(0), '< 1 min')
  assert.equal(formatPrepMinutes(0.4), '< 1 min')
  assert.equal(formatPrepMinutes(26.6), '27 min')
})

test('dados da demo (Lanchonete, Confeitaria, Japonês) respeitam a cronologia', () => {
  for (const [name, demo] of [['Lanchonete', SNACK_BAR_DEMO], ['Confeitaria', CONFECTIONERY_DEMO], ['Japonês', JAPANESE_DEMO]]) {
    const now = Date.now() + 1000
    for (const o of demo.orders) {
      const created = Date.parse(o.createdAt)
      const steps = [o.createdAt, o.prepStartedAt, o.readyAt, o.deliveredAt].filter(Boolean).map(Date.parse)
      for (let i = 1; i < steps.length; i++) assert.ok(steps[i] >= steps[i - 1], `${name} #${o.orderNumber}: etapa ${i} antes da anterior`)
      for (const s of steps) assert.ok(s <= now, `${name} #${o.orderNumber}: horário no futuro`)
      if (o.readyAt) assert.ok(prepMinutes(o) !== null && prepMinutes(o) >= 0, `${name} #${o.orderNumber}: tempo inválido`)
      assert.ok(created <= now)
    }
    const avg = averagePrepMinutes(demo.orders.filter(o => o.status !== 'CANCELLED'))
    assert.ok(avg === null || avg >= 0, `${name}: média negativa`)
  }
})
