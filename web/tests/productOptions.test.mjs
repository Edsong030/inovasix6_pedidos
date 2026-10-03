// Grupos de opções — mesma regra da API (api/src/products/product-options.spec.ts)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeOptionGroups, resolveSelection, groupError, describeRule, summarizeOptions, slugId } from '../lib/productOptions.ts'
import { SNACK_BAR_DEMO, CONFECTIONERY_DEMO, JAPANESE_DEMO } from '../lib/demo/businesses.ts'

const burger = [
  { id: 'ponto', name: 'Ponto da carne', required: true, min: 1, max: 1, multiple: false, options: [
    { id: 'mal', name: 'Mal passado', price: 0, available: true },
    { id: 'ao-ponto', name: 'Ao ponto', price: 0, available: true },
  ] },
  { id: 'adicionais', name: 'Adicionais', required: false, min: 0, max: 2, multiple: true, options: [
    { id: 'bacon', name: 'Bacon', price: 5, available: true },
    { id: 'queijo', name: 'Queijo', price: 3.5, available: true },
    { id: 'ovo', name: 'Ovo', price: 2.5, available: false },
  ] },
]

test('produto sem opções: acréscimo zero', () => {
  assert.deepEqual(resolveSelection('Refri', [], undefined), { extra: 0, chosen: [] })
  assert.deepEqual(normalizeOptionGroups(undefined), { groups: [] })
})

test('preço vem do cadastro e o snapshot guarda nome e preço', () => {
  const r = resolveSelection('X-Burger', burger, ['queijo', 'ao-ponto', 'bacon'])
  assert.equal(r.extra, 8.5)
  assert.deepEqual(r.chosen.map(c => [c.optionName, c.price]), [['Ao ponto', 0], ['Bacon', 5], ['Queijo', 3.5]])
})

test('obrigatório, máximo, indisponível, repetida e de outro produto', () => {
  assert.equal(resolveSelection('X-Burger', burger, ['bacon']).error, 'Escolha "Ponto da carne" em "X-Burger"')
  assert.match(resolveSelection('X-Burger', burger, ['ao-ponto', 'mal']).error, /só uma opção/)
  assert.match(resolveSelection('X-Burger', burger, ['ao-ponto', 'ovo']).error, /indisponível/)
  assert.match(resolveSelection('X-Burger', burger, ['ao-ponto', 'bacon', 'bacon']).error, /repetida/)
  assert.match(resolveSelection('X-Burger', burger, ['ao-ponto', 'id-de-outro-produto']).error, /inválida/)
  assert.equal(groupError(burger[1], 3), 'Escolha no máximo 2')
  assert.equal(groupError(burger[0], 0), 'Escolha uma opção')
})

test('configuração: normaliza e rejeita incoerências', () => {
  const r = normalizeOptionGroups([{ id: 't', name: 'Tamanho', required: true, min: 0, max: 3, multiple: false, options: [{ id: 'p', name: 'P', price: 0 }] }])
  assert.deepEqual([r.groups[0].min, r.groups[0].max, r.groups[0].options[0].available], [1, 1, true])
  assert.match(normalizeOptionGroups([{ id: 'x', name: 'X', multiple: true, min: 3, max: 2, options: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] }]).error, /mínimo/)
  assert.match(normalizeOptionGroups([{ id: 'x', name: 'X', options: [] }]).error, /pelo menos uma opção/)
})

test('textos de apoio', () => {
  assert.equal(describeRule(burger[0]), 'Obrigatório · escolha 1')
  assert.equal(describeRule(burger[1]), 'Opcional · escolha até 2')
  const fmt = n => `R$ ${n.toFixed(2)}`
  assert.deepEqual(summarizeOptions([
    { groupName: 'Ponto', optionName: 'Ao ponto', price: 0 },
    { groupName: 'Adicionais', optionName: 'Bacon', price: '5.00' },
    { groupName: 'Adicionais', optionName: 'Ovo', price: 2.5 },
  ], fmt), [{ group: 'Ponto', items: ['Ao ponto'] }, { group: 'Adicionais', items: ['Bacon (+R$ 5.00)', 'Ovo (+R$ 2.50)'] }])
  const taken = new Set()
  assert.equal(slugId('Remover ingredientes', taken), 'remover-ingredientes')
  assert.equal(slugId('Remover ingredientes', taken), 'remover-ingredientes-2')
})

test('dados da demo: grupos válidos e pedidos coerentes com o cadastro', () => {
  for (const [name, demo] of [['Lanchonete', SNACK_BAR_DEMO], ['Confeitaria', CONFECTIONERY_DEMO], ['Japonês', JAPANESE_DEMO]]) {
    for (const p of demo.products) {
      const r = normalizeOptionGroups(p.optionGroups)
      assert.ok('groups' in r, `${name} / ${p.name}: ${r.error}`)
    }
    for (const o of demo.orders) for (const it of o.items) {
      const p = demo.products.find(x => x.id === it.productId)
      const r = resolveSelection(p.name, p.optionGroups ?? [], (it.options ?? []).map(c => c.optionId))
      assert.ok(!('error' in r), `${name} pedido #${o.orderNumber}: ${r.error}`)
      assert.equal(it.unitPrice, Math.round((p.price + r.extra) * 100) / 100, `${name} #${o.orderNumber}: preço do item`)
    }
  }
})
