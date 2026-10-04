// Matriz de permissões do frontend — espelho da API (api/src/common/permissions.ts e
// api/src/common/operational-permissions.spec.ts). Só esconde ações; a API decide.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MANAGEABLE_ROLES, canManageRole, canCreateOrder, canSeeFinance, canChangeTableStatus,
  canChangeOrderStatus, passwordProblem, isPlatformAdmin,
} from '../lib/permissions.ts'

const ALL = ['ADMIN', 'MANAGER', 'ATTENDANT', 'KITCHEN', 'DELIVERY']
const who = (fn) => ALL.filter(fn)

test('gestão de usuários: MANAGER nunca alcança ADMIN nem MANAGER', () => {
  assert.deepEqual(MANAGEABLE_ROLES.MANAGER, ['ATTENDANT', 'KITCHEN', 'DELIVERY'])
  assert.equal(canManageRole('MANAGER', 'ADMIN'), false)
  assert.equal(canManageRole('MANAGER', 'MANAGER'), false)
  assert.equal(canManageRole('ADMIN', 'ADMIN'), true)
  assert.equal(canManageRole(undefined, 'ATTENDANT'), false)
})

test('criar pedido, faturamento e mesas', () => {
  assert.deepEqual(who(canCreateOrder), ['ADMIN', 'MANAGER', 'ATTENDANT'])
  assert.deepEqual(who(canSeeFinance), ['ADMIN', 'MANAGER'])
  assert.deepEqual(who(canChangeTableStatus), ['ADMIN', 'MANAGER', 'ATTENDANT'])
})

test('transições de status por papel', () => {
  const d = (status) => ({ status, channel: 'DELIVERY' })
  const c = (status) => ({ status, channel: 'COUNTER' })
  for (const to of ['PREPARING', 'READY']) {
    assert.deepEqual(who((r) => canChangeOrderStatus(r, d('RECEIVED'), to)), ['ADMIN', 'MANAGER', 'ATTENDANT', 'KITCHEN'])
  }
  for (const to of ['OUT_FOR_DELIVERY', 'DELIVERED']) {
    assert.deepEqual(who((r) => canChangeOrderStatus(r, d('READY'), to)), ['ADMIN', 'MANAGER', 'ATTENDANT', 'DELIVERY'])
    assert.deepEqual(who((r) => canChangeOrderStatus(r, c('READY'), to)), ['ADMIN', 'MANAGER', 'ATTENDANT'])
  }
  assert.deepEqual(who((r) => canChangeOrderStatus(r, c('RECEIVED'), 'CANCELLED')), ['ADMIN', 'MANAGER', 'ATTENDANT'])
  assert.deepEqual(who((r) => canChangeOrderStatus(r, c('PREPARING'), 'CANCELLED')), ['ADMIN', 'MANAGER'])
})

test('regra de senha nova igual à da API', () => {
  for (const bad of ['abc12345', 'somenteletras', '12345678901', 'admin123']) assert.ok(passwordProblem(bad), bad)
  for (const ok of ['SenhaForte123', 'cafe com leite 2026', 'Pão de queijo 10']) assert.equal(passwordProblem(ok), null, ok)
})

test('PLATFORM_ADMIN: só a área da plataforma, nada da operação', () => {
  const p = 'PLATFORM_ADMIN'
  assert.deepEqual(MANAGEABLE_ROLES.PLATFORM_ADMIN, [])
  for (const r of ALL) assert.equal(canManageRole(r, p), false, r)
  assert.equal(isPlatformAdmin(p), true)
  for (const r of ALL) assert.equal(isPlatformAdmin(r), false, r)
  assert.equal(canCreateOrder(p), false)
  assert.equal(canSeeFinance(p), false)
  assert.equal(canChangeTableStatus(p), false)
  for (const to of ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']) {
    assert.equal(canChangeOrderStatus(p, { status: 'RECEIVED', channel: 'DELIVERY' }, to), false, to)
  }
})
