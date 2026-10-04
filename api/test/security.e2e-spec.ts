/**
 * Testes HTTP de segurança (Fase 1) com dois restaurantes reais no banco de teste:
 *   • escalada de privilégio na gestão de usuários;
 *   • isolamento de mesas entre restaurantes na criação de pedidos;
 *   • número de pedido único e sequencial sob concorrência.
 */
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PASSWORD = 'SenhaDeTeste123';
const prisma = new PrismaClient();
let app: NestExpressApplication;
let http: ReturnType<typeof request>;

type Ctx = { restaurantId: string; slug: string; tableId: string; productId: string; users: Record<string, string> };
const A = {} as Ctx;
const B = {} as Ctx;
const tokens: Record<string, string> = {};

async function createRestaurant(ctx: Ctx, slug: string, roles: Array<[key: string, role: UserRole]>) {
  const r = await prisma.restaurant.create({ data: { slug, name: slug } });
  const hash = await bcrypt.hash(PASSWORD, 4);
  ctx.restaurantId = r.id;
  ctx.slug = slug;
  ctx.users = {};
  for (const [key, role] of roles) {
    const u = await prisma.user.create({ data: { restaurantId: r.id, name: key, email: `${key}@${slug}.test`, password: hash, role } });
    ctx.users[key] = u.id;
  }
  ctx.tableId = (await prisma.table.create({ data: { restaurantId: r.id, number: '01' } })).id;
  const cat = await prisma.category.create({ data: { restaurantId: r.id, name: 'Pratos' } });
  ctx.productId = (await prisma.product.create({ data: { restaurantId: r.id, categoryId: cat.id, name: 'Prato', price: 10 } })).id;
}

async function login(ctx: Ctx, key: string) {
  const res = await http.post('/api/auth/login').send({ email: `${key}@${ctx.slug}.test`, password: PASSWORD, restaurantSlug: ctx.slug });
  expect(res.status).toBe(200);
  return sessionCookie(res);
}
/** Cookie de sessão devolvido no login (o corpo não traz token). */
function sessionCookie(res: request.Response) {
  const set = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const c = set.find((v) => v.startsWith('inx_session='));
  expect(c).toBeDefined();
  return c!.split(';')[0];
}
const auth = (key: string) => ({ Cookie: tokens[key] });
const order = (ctx: Ctx, extra: Record<string, unknown> = {}) => ({
  channel: 'COUNTER', paymentMethod: 'PIX', items: [{ productId: ctx.productId, quantity: 1 }], ...extra,
});

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = mod.createNestApplication<NestExpressApplication>();
  configureApp(app);
  // Um único servidor para toda a suíte (inclusive requisições simultâneas)
  await app.listen(0, '127.0.0.1');
  http = request(await app.getUrl());

  await createRestaurant(A, 'rest-a', [['admin', 'ADMIN'], ['admin2', 'ADMIN'], ['manager', 'MANAGER'], ['attendant', 'ATTENDANT']]);
  await createRestaurant(B, 'rest-b', [['admin', 'ADMIN']]);
  for (const k of ['admin', 'admin2', 'manager', 'attendant']) tokens[k] = await login(A, k);
  tokens.bAdmin = await login(B, 'admin');
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

// ─── 1. Escalada de privilégio ────────────────────────────────────────────────
describe('usuários: MANAGER nunca alcança ADMIN', () => {
  it('MANAGER não cria ADMIN nem MANAGER (403); cria atendente (201)', async () => {
    const body = (role: string) => ({ name: 'Novo', email: `novo-${role}@rest-a.test`, password: PASSWORD, role });
    expect((await http.post('/api/users').set(auth('manager')).send(body('ADMIN'))).status).toBe(403);
    expect((await http.post('/api/users').set(auth('manager')).send(body('MANAGER'))).status).toBe(403);
    expect((await http.post('/api/users').set(auth('manager')).send(body('ATTENDANT'))).status).toBe(201);
    expect(await prisma.user.count({ where: { restaurantId: A.restaurantId, email: { startsWith: 'novo-' }, role: { in: ['ADMIN', 'MANAGER'] } } })).toBe(0);
  });

  it.each([
    ['redefinir a senha', { password: 'TomadaDeConta123' }],
    ['editar', { name: 'Hackeado' }],
    ['desativar', { active: false }],
    ['rebaixar', { role: 'ATTENDANT' }],
  ])('MANAGER não pode %s um ADMIN (403) e o ADMIN continua entrando', async (_, dto) => {
    const res = await http.patch(`/api/users/${A.users.admin}`).set(auth('manager')).send(dto);
    expect(res.status).toBe(403);
    const admin = await prisma.user.findUniqueOrThrow({ where: { id: A.users.admin } });
    expect(admin).toMatchObject({ name: 'admin', role: 'ADMIN', active: true });
    expect(await bcrypt.compare(PASSWORD, admin.password)).toBe(true);
  });

  it('MANAGER não promove a si mesmo nem promove atendente a ADMIN (403)', async () => {
    expect((await http.patch(`/api/users/${A.users.manager}`).set(auth('manager')).send({ role: 'ADMIN' })).status).toBe(403);
    expect((await http.patch(`/api/users/${A.users.attendant}`).set(auth('manager')).send({ role: 'ADMIN' })).status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: A.users.manager } })).role).toBe('MANAGER');
    expect((await prisma.user.findUniqueOrThrow({ where: { id: A.users.attendant } })).role).toBe('ATTENDANT');
  });

  it('MANAGER não usa DELETE (só ADMIN) — 403', async () => {
    expect((await http.delete(`/api/users/${A.users.attendant}`).set(auth('manager'))).status).toBe(403);
  });

  it('ADMIN não altera o próprio papel nem se desativa (403)', async () => {
    expect((await http.patch(`/api/users/${A.users.admin}`).set(auth('admin')).send({ role: 'MANAGER' })).status).toBe(403);
    expect((await http.patch(`/api/users/${A.users.admin}`).set(auth('admin')).send({ active: false })).status).toBe(403);
    expect((await http.delete(`/api/users/${A.users.admin}`).set(auth('admin'))).status).toBe(403);
  });

  it('dois ADMINs rebaixando um ao outro ao mesmo tempo: um consegue, o outro é recusado e sobra 1 ADMIN', async () => {
    const [r1, r2] = await Promise.all([
      http.patch(`/api/users/${A.users.admin2}`).set(auth('admin')).send({ role: 'MANAGER' }),
      http.patch(`/api/users/${A.users.admin}`).set(auth('admin2')).send({ role: 'MANAGER' }),
    ]);
    // Exatamente um vence. O outro é recusado conforme o instante em que chega: 409 (seria o
    // último ADMIN), 403 (o papel, lido do banco, já é MANAGER) ou 401 (sessão já revogada).
    const statuses = [r1.status, r2.status];
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect([401, 403, 409]).toContain(statuses.find((s) => s !== 200));
    expect(await prisma.user.count({ where: { restaurantId: A.restaurantId, role: 'ADMIN', active: true } })).toBe(1);
    // Restaura para os demais testes (mudar o papel derrubou a sessão do rebaixado: entra de novo)
    await prisma.user.updateMany({ where: { id: { in: [A.users.admin, A.users.admin2] } }, data: { role: 'ADMIN' } });
    tokens.admin = await login(A, 'admin');
    tokens.admin2 = await login(A, 'admin2');
  });

  it('ADMIN do restaurante A não altera usuário do B (404)', async () => {
    expect((await http.patch(`/api/users/${B.users.admin}`).set(auth('admin')).send({ name: 'x' })).status).toBe(404);
    expect((await http.delete(`/api/users/${B.users.admin}`).set(auth('admin'))).status).toBe(404);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: B.users.admin } })).name).toBe('admin');
  });
});

// ─── 2. Isolamento de mesas ───────────────────────────────────────────────────
describe('pedidos: mesa de outro restaurante', () => {
  it('token do A com mesa do B → 404, nada gravado e a mesa do B continua livre', async () => {
    const before = await prisma.restaurant.findUniqueOrThrow({ where: { id: A.restaurantId }, select: { orderSeq: true } });
    const res = await http.post('/api/orders').set(auth('attendant')).send(order(A, { channel: 'DINE_IN', tableId: B.tableId }));
    expect(res.status).toBe(404);
    expect((await prisma.table.findUniqueOrThrow({ where: { id: B.tableId } })).status).toBe('AVAILABLE');
    expect(await prisma.order.count({ where: { tableId: B.tableId } })).toBe(0);
    // Transação desfeita: o número não foi consumido
    const after = await prisma.restaurant.findUniqueOrThrow({ where: { id: A.restaurantId }, select: { orderSeq: true } });
    expect(after.orderSeq).toBe(before.orderSeq);
  });

  it('mesa do próprio restaurante → 201 e mesa ocupada', async () => {
    const res = await http.post('/api/orders').set(auth('attendant')).send(order(A, { channel: 'DINE_IN', tableId: A.tableId }));
    expect(res.status).toBe(201);
    expect(res.body.table.id).toBe(A.tableId);
    expect((await prisma.table.findUniqueOrThrow({ where: { id: A.tableId } })).status).toBe('OCCUPIED');
  });

  it('token do B não altera nem libera pedido/mesa do A (404)', async () => {
    const o = await prisma.order.findFirstOrThrow({ where: { tableId: A.tableId } });
    expect((await http.patch(`/api/orders/${o.id}/status`).set(auth('bAdmin')).send({ status: 'CANCELLED', reason: 'Teste' })).status).toBe(404);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('RECEIVED');
    expect((await prisma.table.findUniqueOrThrow({ where: { id: A.tableId } })).status).toBe('OCCUPIED');
  });
});

// ─── 3. Número do pedido ──────────────────────────────────────────────────────
describe('pedidos: número único sob concorrência', () => {
  it('30 pedidos simultâneos no A recebem números distintos e sequenciais; o B tem sua própria sequência', async () => {
    const start = (await prisma.restaurant.findUniqueOrThrow({ where: { id: A.restaurantId }, select: { orderSeq: true } })).orderSeq;
    const results = await Promise.all([
      ...Array.from({ length: 30 }, () => http.post('/api/orders').set(auth('attendant')).send(order(A))),
      ...Array.from({ length: 5 }, () => http.post('/api/orders').set(auth('bAdmin')).send(order(B))),
    ]);
    expect(results.map((r) => r.status).every((s) => s === 201)).toBe(true);
    const numsA = results.slice(0, 30).map((r) => r.body.orderNumber).sort((x, y) => x - y);
    const numsB = results.slice(30).map((r) => r.body.orderNumber).sort((x, y) => x - y);
    expect(numsA).toEqual(Array.from({ length: 30 }, (_, i) => start + 1 + i));
    expect(numsB).toEqual([1, 2, 3, 4, 5]);
  });

  it('o banco recusa número repetido no mesmo restaurante (índice único)', async () => {
    const existing = await prisma.order.findFirstOrThrow({ where: { restaurantId: A.restaurantId } });
    await expect(prisma.order.create({
      data: {
        restaurantId: A.restaurantId, userId: A.users.admin, orderNumber: existing.orderNumber,
        channel: 'COUNTER', paymentMethod: 'PIX', subtotal: 1, total: 1,
      },
    })).rejects.toMatchObject({ code: 'P2002' });
  });
});
