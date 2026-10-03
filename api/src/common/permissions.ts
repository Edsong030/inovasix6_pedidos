import { UserRole } from '@prisma/client';

/**
 * Matriz central de permissões de gestão de usuários.
 *
 * Quem pode criar, editar, redefinir senha, ativar/desativar ou mudar o papel de quem:
 *
 *   papel de quem age │ pode gerenciar usuários com papel
 *   ──────────────────┼─────────────────────────────────────────────
 *   ADMIN             │ ADMIN, MANAGER, ATTENDANT, KITCHEN, DELIVERY
 *   MANAGER           │ ATTENDANT, KITCHEN, DELIVERY
 *   ATTENDANT         │ —
 *   KITCHEN           │ —
 *   DELIVERY          │ —
 *
 * Regras adicionais (aplicadas em UsersService):
 *   • ninguém altera o próprio papel nem desativa a si mesmo;
 *   • o último ADMIN ativo do restaurante não pode ser desativado nem rebaixado;
 *   • ao promover/rebaixar, quem age precisa poder gerenciar o papel atual E o novo.
 */
export const MANAGEABLE_ROLES: Readonly<Record<UserRole, readonly UserRole[]>> = {
  [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ATTENDANT, UserRole.KITCHEN, UserRole.DELIVERY],
  [UserRole.MANAGER]: [UserRole.ATTENDANT, UserRole.KITCHEN, UserRole.DELIVERY],
  [UserRole.ATTENDANT]: [],
  [UserRole.KITCHEN]: [],
  [UserRole.DELIVERY]: [],
};

/** Papéis que acessam a gestão de usuários (listar, criar, editar). */
export const USER_ADMIN_ROLES: readonly UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];

export function canManageRole(actor: UserRole, target: UserRole): boolean {
  return (MANAGEABLE_ROLES[actor] ?? []).includes(target);
}

// ─── Matriz operacional ───────────────────────────────────────────────────────
//
//   ação                                   │ ADMIN MANAGER ATTENDANT KITCHEN DELIVERY
//   ───────────────────────────────────────┼─────────────────────────────────────────
//   criar pedido                           │  sim    sim      sim      não     não
//   consultar pedidos                      │  sim    sim      sim      sim     só canal DELIVERY
//   RECEIVED → PREPARING → READY           │  sim    sim      sim      sim     não
//   READY → OUT_FOR_DELIVERY → DELIVERED   │  sim    sim      sim      não     só canal DELIVERY
//   cancelar pedido                        │  sim    sim      só RECEIVED não  não
//   faturamento, relatórios e histórico    │  sim    sim      não      não     não
//   cozinha/produção (fila)                │  sim    sim      sim*     sim     não
//   mesas: consultar                       │  sim    sim      sim      sim     não
//   mesas: alterar status                  │  sim    sim      sim      não     não
//
//   * ATTENDANT vê a produção: coordena balcão e salão com a cozinha (quando chamar o
//     cliente, o que falta sair) e já pode avançar o preparo pela linha acima.

const { ADMIN, MANAGER, ATTENDANT, KITCHEN, DELIVERY } = UserRole;

export const ORDER_CREATE_ROLES: readonly UserRole[] = [ADMIN, MANAGER, ATTENDANT];
export const ORDER_READ_ROLES: readonly UserRole[] = [ADMIN, MANAGER, ATTENDANT, KITCHEN, DELIVERY];
export const FINANCE_ROLES: readonly UserRole[] = [ADMIN, MANAGER];
export const KITCHEN_ROLES: readonly UserRole[] = [ADMIN, MANAGER, ATTENDANT, KITCHEN];
export const TABLE_READ_ROLES: readonly UserRole[] = [ADMIN, MANAGER, ATTENDANT, KITCHEN];
export const TABLE_STATUS_ROLES: readonly UserRole[] = [ADMIN, MANAGER, ATTENDANT];
/** RECEIVED → PREPARING → READY */
const PREPARE_ROLES: readonly UserRole[] = [ADMIN, MANAGER, ATTENDANT, KITCHEN];
/** READY → OUT_FOR_DELIVERY → DELIVERED (DELIVERY só em pedidos do canal DELIVERY) */
const DISPATCH_ROLES: readonly UserRole[] = [ADMIN, MANAGER, ATTENDANT];
/** Cancelar em qualquer etapa (ATTENDANT só enquanto RECEIVED) */
const CANCEL_ROLES: readonly UserRole[] = [ADMIN, MANAGER];

type OrderRef = { status: string; channel: string };

/** Filtro extra de visibilidade de pedidos por papel (somado ao restaurantId). */
export function orderVisibility(role: UserRole): { channel?: 'DELIVERY' } {
  return role === DELIVERY ? { channel: 'DELIVERY' } : {};
}

export function canSeeOrder(role: UserRole, order: Pick<OrderRef, 'channel'>): boolean {
  return role !== DELIVERY || order.channel === 'DELIVERY';
}

export function canSeeFinance(role: UserRole): boolean {
  return FINANCE_ROLES.includes(role);
}

/** O papel pode levar este pedido ao status `to`? (A validade da transição é checada à parte.) */
export function canChangeOrderStatus(role: UserRole, order: OrderRef, to: string): boolean {
  switch (to) {
    case 'PREPARING':
    case 'READY':
      return PREPARE_ROLES.includes(role);
    case 'OUT_FOR_DELIVERY':
    case 'DELIVERED':
      return DISPATCH_ROLES.includes(role) || (role === DELIVERY && order.channel === 'DELIVERY');
    case 'CANCELLED':
      return CANCEL_ROLES.includes(role) || (role === ATTENDANT && order.status === 'RECEIVED');
    default:
      return false;
  }
}
