/**
 * Espelho, no frontend, da matriz de permissões da API (api/src/common/permissions.ts).
 * Serve só para esconder ações que o perfil não pode executar: a regra definitiva é
 * sempre a da API, que recusa com 403/404 o que não for permitido.
 */
import type { OrderStatus, UserRole } from '@/types'

type Role = UserRole | undefined | null

/** Quem pode criar/editar/desativar usuários de cada papel. */
export const MANAGEABLE_ROLES: Record<UserRole, readonly UserRole[]> = {
  ADMIN:     ['ADMIN', 'MANAGER', 'ATTENDANT', 'KITCHEN', 'DELIVERY'],
  MANAGER:   ['ATTENDANT', 'KITCHEN', 'DELIVERY'],
  ATTENDANT: [],
  KITCHEN:   [],
  DELIVERY:  [],
  PLATFORM_ADMIN: [],
}

/** Equipe Inovasix6: só a área /platform (a API confere também o estabelecimento da plataforma). */
export const isPlatformAdmin = (role: Role) => role === 'PLATFORM_ADMIN'

export function canManageRole(actor: Role, target: UserRole): boolean {
  return !!actor && MANAGEABLE_ROLES[actor].includes(target)
}

const has = (list: readonly UserRole[], role: Role) => !!role && list.includes(role)

export const canCreateOrder = (role: Role) => has(['ADMIN', 'MANAGER', 'ATTENDANT'], role)
export const canSeeFinance  = (role: Role) => has(['ADMIN', 'MANAGER'], role)
export const canChangeTableStatus = (role: Role) => has(['ADMIN', 'MANAGER', 'ATTENDANT'], role)

/** O perfil pode levar este pedido ao status `to`? */
export function canChangeOrderStatus(role: Role, order: { status: OrderStatus; channel: string }, to: OrderStatus): boolean {
  switch (to) {
    case 'PREPARING':
    case 'READY':
      return has(['ADMIN', 'MANAGER', 'ATTENDANT', 'KITCHEN'], role)
    case 'OUT_FOR_DELIVERY':
    case 'DELIVERED':
      return has(['ADMIN', 'MANAGER', 'ATTENDANT'], role) || (role === 'DELIVERY' && order.channel === 'DELIVERY')
    case 'CANCELLED':
      return has(['ADMIN', 'MANAGER'], role) || (role === 'ATTENDANT' && order.status === 'RECEIVED')
    default:
      return false
  }
}

/** Regra de senha nova (a mesma da API). Retorna a mensagem de erro ou null. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return 'A senha precisa ter pelo menos 10 caracteres'
  if (!/\p{L}/u.test(password)) return 'A senha precisa ter pelo menos uma letra'
  if (!/\d/.test(password)) return 'A senha precisa ter pelo menos um número'
  return null
}
