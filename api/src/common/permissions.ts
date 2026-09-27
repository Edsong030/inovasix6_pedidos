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
