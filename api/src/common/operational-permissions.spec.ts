import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '@prisma/client';
import {
  canChangeOrderStatus, canSeeFinance, canSeeOrder, orderVisibility,
  FINANCE_ROLES, KITCHEN_ROLES, ORDER_CREATE_ROLES, TABLE_READ_ROLES, TABLE_STATUS_ROLES,
} from './permissions';
import { CreateUserDto } from '../users/dto/create-user.dto';

const { ADMIN, MANAGER, ATTENDANT, KITCHEN, DELIVERY } = UserRole;
const ALL = [ADMIN, MANAGER, ATTENDANT, KITCHEN, DELIVERY];
const who = (fn: (r: UserRole) => boolean) => ALL.filter(fn);

describe('matriz operacional', () => {
  it('criar pedido: ADMIN, MANAGER, ATTENDANT', () => expect(ORDER_CREATE_ROLES).toEqual([ADMIN, MANAGER, ATTENDANT]));
  it('faturamento/relatórios/histórico: ADMIN, MANAGER', () => {
    expect(FINANCE_ROLES).toEqual([ADMIN, MANAGER]);
    expect(who(canSeeFinance)).toEqual([ADMIN, MANAGER]);
  });
  it('cozinha: ADMIN, MANAGER, ATTENDANT, KITCHEN', () => expect(KITCHEN_ROLES).toEqual([ADMIN, MANAGER, ATTENDANT, KITCHEN]));
  it('mesas: consultar A/M/ATT/KITCHEN; alterar status A/M/ATT', () => {
    expect(TABLE_READ_ROLES).toEqual([ADMIN, MANAGER, ATTENDANT, KITCHEN]);
    expect(TABLE_STATUS_ROLES).toEqual([ADMIN, MANAGER, ATTENDANT]);
  });
  it('DELIVERY só enxerga pedidos do canal DELIVERY', () => {
    expect(orderVisibility(DELIVERY)).toEqual({ channel: 'DELIVERY' });
    for (const r of [ADMIN, MANAGER, ATTENDANT, KITCHEN]) expect(orderVisibility(r)).toEqual({});
    expect(canSeeOrder(DELIVERY, { channel: 'COUNTER' })).toBe(false);
    expect(canSeeOrder(DELIVERY, { channel: 'DINE_IN' })).toBe(false);
    expect(canSeeOrder(DELIVERY, { channel: 'DELIVERY' })).toBe(true);
  });
});

describe('transições de status por papel', () => {
  const counter = (status: string) => ({ status, channel: 'COUNTER' });
  const delivery = (status: string) => ({ status, channel: 'DELIVERY' });

  it.each(['PREPARING', 'READY'])('→ %s: ADMIN, MANAGER, ATTENDANT, KITCHEN', (to) => {
    expect(who((r) => canChangeOrderStatus(r, delivery('RECEIVED'), to))).toEqual([ADMIN, MANAGER, ATTENDANT, KITCHEN]);
  });
  it.each(['OUT_FOR_DELIVERY', 'DELIVERED'])('→ %s em pedido de delivery: ADMIN, MANAGER, ATTENDANT, DELIVERY', (to) => {
    expect(who((r) => canChangeOrderStatus(r, delivery('READY'), to))).toEqual([ADMIN, MANAGER, ATTENDANT, DELIVERY]);
  });
  it.each(['OUT_FOR_DELIVERY', 'DELIVERED'])('→ %s em pedido de balcão: DELIVERY não', (to) => {
    expect(who((r) => canChangeOrderStatus(r, counter('READY'), to))).toEqual([ADMIN, MANAGER, ATTENDANT]);
  });
  it('cancelar: ADMIN e MANAGER sempre; ATTENDANT só enquanto RECEIVED; KITCHEN e DELIVERY nunca', () => {
    expect(who((r) => canChangeOrderStatus(r, counter('RECEIVED'), 'CANCELLED'))).toEqual([ADMIN, MANAGER, ATTENDANT]);
    for (const st of ['PREPARING', 'READY', 'OUT_FOR_DELIVERY']) {
      expect(who((r) => canChangeOrderStatus(r, delivery(st), 'CANCELLED'))).toEqual([ADMIN, MANAGER]);
    }
  });
  it('status desconhecido: ninguém', () => {
    expect(who((r) => canChangeOrderStatus(r, counter('RECEIVED'), 'PAGO'))).toEqual([]);
  });
});

describe('política de senha (usuários novos e troca de senha)', () => {
  const errors = async (password: string) => {
    const dto = plainToInstance(CreateUserDto, { name: 'Teste', email: 't@x.com', role: ATTENDANT, password });
    return (await validate(dto)).filter((e) => e.property === 'password').flatMap((e) => Object.values(e.constraints ?? {}));
  };
  it.each([
    ['curta', 'abc12345'],
    ['sem número', 'somenteletras'],
    ['sem letra', '12345678901'],
    ['antiga da demo (admin123)', 'admin123'],
  ])('recusa senha %s', async (_, pw) => {
    expect((await errors(pw)).length).toBeGreaterThan(0);
  });
  it.each(['SenhaForte123', 'cafe com leite 2026', 'Pão de queijo 10'])('aceita "%s"', async (pw) => {
    expect(await errors(pw)).toEqual([]);
  });
});
