import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService, type Actor } from './users.service';
import { MANAGEABLE_ROLES, canManageRole } from '../common/permissions';

const { ADMIN, MANAGER, ATTENDANT, KITCHEN, DELIVERY } = UserRole;
type Row = { id: string; restaurantId: string; role: UserRole; active: boolean; email: string; name: string };

/** Prisma em memória com o que o UsersService usa (inclusive $transaction e $queryRaw). */
function fakePrisma(seed: Row[]) {
  const users = seed.map((u) => ({ ...u }));
  const match = (u: Row, w: Record<string, any>) => Object.entries(w).every(([k, v]) =>
    v && typeof v === 'object' && 'not' in v ? u[k as keyof Row] !== v.not : u[k as keyof Row] === v);
  const client: any = {
    user: {
      findUnique: jest.fn(async ({ where }) => users.find((u) => u.email === where.email_restaurantId.email && u.restaurantId === where.email_restaurantId.restaurantId) ?? null),
      findFirst: jest.fn(async ({ where }) => users.find((u) => match(u, where)) ?? null),
      count: jest.fn(async ({ where }) => users.filter((u) => match(u, where)).length),
      create: jest.fn(async ({ data }) => { const u = { id: `u${users.length + 1}`, active: true, ...data }; users.push(u); return u; }),
      update: jest.fn(async ({ where, data }) => {
        const u = users.find((x) => match(x, where));
        if (!u) throw new Error('not found');
        Object.assign(u, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
        return u;
      }),
    },
    $queryRaw: jest.fn(async () => []),
    userSession: { updateMany: jest.fn(async () => ({ count: 1 })) },
  };
  client.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(client));
  return { client, users };
}

const R = 'rest-a';
const base: Row[] = [
  { id: 'admin', restaurantId: R, role: ADMIN, active: true, email: 'admin@a', name: 'Admin' },
  { id: 'manager', restaurantId: R, role: MANAGER, active: true, email: 'gerente@a', name: 'Gerente' },
  { id: 'manager2', restaurantId: R, role: MANAGER, active: true, email: 'gerente2@a', name: 'Gerente 2' },
  { id: 'attendant', restaurantId: R, role: ATTENDANT, active: true, email: 'atendente@a', name: 'Atendente' },
  { id: 'other-admin', restaurantId: 'rest-b', role: ADMIN, active: true, email: 'admin@b', name: 'Admin B' },
];
const as = (id: string): Actor => { const u = base.find((x) => x.id === id)!; return { id, role: u.role, restaurantId: u.restaurantId }; };
const setup = (rows = base) => { const { client, users } = fakePrisma(rows); return { svc: new UsersService(client), users, client }; };
const newUser = (role: UserRole) => ({ name: 'Novo', email: `novo-${role}@a`, password: 'segredo123', role });

describe('matriz de permissões', () => {
  it('ADMIN gerencia todos os papéis; MANAGER só atendente, cozinha e entrega; demais, ninguém', () => {
    expect(MANAGEABLE_ROLES[ADMIN]).toEqual([ADMIN, MANAGER, ATTENDANT, KITCHEN, DELIVERY]);
    expect(MANAGEABLE_ROLES[MANAGER]).toEqual([ATTENDANT, KITCHEN, DELIVERY]);
    for (const r of [ATTENDANT, KITCHEN, DELIVERY]) expect(MANAGEABLE_ROLES[r]).toEqual([]);
  });
  it('MANAGER nunca gerencia ADMIN nem MANAGER', () => {
    expect(canManageRole(MANAGER, ADMIN)).toBe(false);
    expect(canManageRole(MANAGER, MANAGER)).toBe(false);
  });
});

describe('UsersService — MANAGER x ADMIN', () => {
  it('MANAGER não cria ADMIN nem MANAGER', async () => {
    const { svc, client } = setup();
    await expect(svc.create(as('manager'), newUser(ADMIN))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.create(as('manager'), newUser(MANAGER))).rejects.toBeInstanceOf(ForbiddenException);
    expect(client.user.create).not.toHaveBeenCalled();
  });
  it('MANAGER cria atendente, cozinha e entrega', async () => {
    const { svc } = setup();
    for (const r of [ATTENDANT, KITCHEN, DELIVERY]) await expect(svc.create(as('manager'), newUser(r))).resolves.toMatchObject({ role: r });
  });
  it.each([
    ['editar nome', { name: 'Hackeado' }],
    ['redefinir senha', { password: 'tomada123' }],
    ['desativar', { active: false }],
    ['reativar', { active: true }],
    ['rebaixar', { role: ATTENDANT }],
  ])('MANAGER não pode %s um ADMIN', async (_, dto) => {
    const { svc, users } = setup();
    await expect(svc.update('admin', as('manager'), dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.find((u) => u.id === 'admin')).toMatchObject({ name: 'Admin', role: ADMIN, active: true });
  });
  it('MANAGER não altera outro MANAGER', async () => {
    const { svc } = setup();
    await expect(svc.update('manager2', as('manager'), { name: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('MANAGER não promove atendente a ADMIN nem a MANAGER', async () => {
    const { svc, users } = setup();
    await expect(svc.update('attendant', as('manager'), { role: ADMIN })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.update('attendant', as('manager'), { role: MANAGER })).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.find((u) => u.id === 'attendant')!.role).toBe(ATTENDANT);
  });
  it('MANAGER edita e desativa atendente', async () => {
    const { svc } = setup();
    await expect(svc.update('attendant', as('manager'), { name: 'Ana', active: false })).resolves.toMatchObject({ name: 'Ana', active: false });
  });
});

describe('UsersService — próprio usuário e último ADMIN', () => {
  it('ninguém altera o próprio papel (nem ADMIN, nem MANAGER)', async () => {
    const { svc } = setup();
    await expect(svc.update('manager', as('manager'), { role: ADMIN })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.update('admin', as('admin'), { role: MANAGER })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('ninguém desativa a si mesmo', async () => {
    const { svc } = setup();
    await expect(svc.update('admin', as('admin'), { active: false })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.remove('admin', as('admin'))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('pode editar os próprios dados (nome e senha) sem mudar o acesso', async () => {
    const { svc } = setup();
    await expect(svc.update('manager', as('manager'), { name: 'Carlos', password: 'novaSenha123' })).resolves.toMatchObject({ name: 'Carlos', role: MANAGER });
  });
  it('não desativa nem rebaixa o último ADMIN ativo', async () => {
    const rows: Row[] = [
      { id: 'a1', restaurantId: R, role: ADMIN, active: true, email: 'a1@a', name: 'A1' },
      { id: 'a2', restaurantId: R, role: ADMIN, active: false, email: 'a2@a', name: 'A2 (inativo)' },
    ];
    const { svc } = setup(rows);
    // a2 inativo não conta como "outro ADMIN ativo"; a1 é o último
    const actor: Actor = { id: 'a2', role: ADMIN, restaurantId: R };
    await expect(svc.update('a1', actor, { active: false })).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.update('a1', actor, { role: MANAGER })).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.remove('a1', actor)).rejects.toBeInstanceOf(ConflictException);
  });
  it('com outro ADMIN ativo, ADMIN pode rebaixar ADMIN', async () => {
    const rows: Row[] = [
      { id: 'a1', restaurantId: R, role: ADMIN, active: true, email: 'a1@a', name: 'A1' },
      { id: 'a2', restaurantId: R, role: ADMIN, active: true, email: 'a2@a', name: 'A2' },
    ];
    const { svc } = setup(rows);
    await expect(svc.update('a2', { id: 'a1', role: ADMIN, restaurantId: R }, { role: MANAGER })).resolves.toMatchObject({ role: MANAGER });
  });
  it('trava os ADMINs ativos na transação (serializa rebaixamentos simultâneos)', async () => {
    const { svc, client } = setup();
    await svc.update('attendant', as('admin'), { name: 'x' });
    expect(client.$transaction).toHaveBeenCalled();
    expect(client.$queryRaw.mock.calls[0][0].join('')).toMatch(/FOR UPDATE/);
  });
});

describe('UsersService — isolamento', () => {
  it('usuário de outro restaurante é "não encontrado", mesmo para ADMIN', async () => {
    const { svc, users } = setup();
    await expect(svc.update('other-admin', as('admin'), { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.remove('other-admin', as('admin'))).rejects.toBeInstanceOf(NotFoundException);
    expect(users.find((u) => u.id === 'other-admin')!.name).toBe('Admin B');
  });
});

describe('UsersService — revogação de sessões', () => {
  const revokedFor = (client: any) => client.userSession.updateMany.mock.calls.map((c: any[]) => c[0].where.userId);

  it.each([
    ['troca de senha', { password: 'NovaSenha12345' }],
    ['troca de papel', { role: KITCHEN }],
    ['desativação', { active: false }],
  ])('%s revoga todas as sessões do usuário', async (_, dto) => {
    const { svc, client } = setup();
    await svc.update('attendant', as('admin'), dto);
    expect(revokedFor(client)).toEqual(['attendant']);
    expect(client.userSession.updateMany.mock.calls[0][0]).toMatchObject({ where: { userId: 'attendant', revokedAt: null } });
  });

  it('DELETE (desativação) revoga as sessões', async () => {
    const { svc, client } = setup();
    await svc.remove('attendant', as('admin'));
    expect(revokedFor(client)).toEqual(['attendant']);
  });

  it('editar só nome/e-mail não derruba a sessão', async () => {
    const { svc, client } = setup();
    await svc.update('attendant', as('admin'), { name: 'Ana Paula', email: 'ana@a' });
    expect(client.userSession.updateMany).not.toHaveBeenCalled();
  });

  it('tentativa proibida não revoga nada', async () => {
    const { svc, client } = setup();
    await expect(svc.update('admin', as('manager'), { password: 'Tomada12345' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(client.userSession.updateMany).not.toHaveBeenCalled();
  });
});
