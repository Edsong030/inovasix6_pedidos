/**
 * Testes HTTP da Fase 2A (sessão por cookie + matriz operacional), com dois restaurantes
 * reais no banco de teste e um usuário de cada papel no restaurante A.
 */
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MAX_PER_ACCOUNT } from '../src/auth/login-rate-limiter';

const PASSWORD = 'SenhaDeTeste123';
const prisma = new PrismaClient();
let app: NestExpressApplication;
let http: ReturnType<typeof request>;

type Ctx = { restaurantId: string; slug: string; tableId: string; productId: string; users: Record<string, string> };
const A = {} as Ctx;
const B = {} as Ctx;
const cookies: Record<string, string> = {};

async function createRestaurant(ctx: Ctx, slug: string, roles: Array<[key: string, role: UserRole]>) {
  const r = await prisma.restaurant.create({ data: { slug, name: slug } });
  const hash = await bcrypt.hash(PASSWORD, 4);
  Object.assign(ctx, { restaurantId: r.id, slug, users: {} });
  for (const [key, role] of roles) {
    ctx.users[key] = (await prisma.user.create({ data: { restaurantId: r.id, name: key, email: `${key}@${slug}.test`, password: hash, role } })).id;
  }
  ctx.tableId = (await prisma.table.create({ data: { restaurantId: r.id, number: '01' } })).id;
  const cat = await prisma.category.create({ data: { restaurantId: r.id, name: 'Pratos' } });
  ctx.productId = (await prisma.product.create({ data: { restaurantId: r.id, categoryId: cat.id, name: 'Prato', price: 10 } })).id;
}

function sessionCookie(res: request.Response): string {
  const c = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((v) => v.startsWith('inx_session='));
  expect(c).toBeDefined();
  return c!;
}
async function login(ctx: Ctx, key: string, password = PASSWORD) {
  const res = await http.post('/api/auth/login').send({ email: `${key}@${ctx.slug}.test`, password, restaurantSlug: ctx.slug });
  expect(res.status).toBe(200);
  return sessionCookie(res).split(';')[0];
}
const as = (key: string) => ({ Cookie: cookies[key] });
const newOrder = (ctx: Ctx, channel: string, extra: Record<string, unknown> = {}) => ({
  channel, paymentMethod: 'PIX', items: [{ productId: ctx.productId, quantity: 1 }], ...extra,
});
async function createOrder(channel: string, extra: Record<string, unknown> = {}) {
  const res = await http.post('/api/orders').set(as('admin')).send(newOrder(A, channel, extra));
  expect(res.status).toBe(201);
  return res.body as { id: string; status: string };
}
// Cancelar exige motivo (DTO): o helper envia um para que os testes exercitem papel e transição
const setStatus = (key: string, id: string, status: string) =>
  http.patch(`/api/orders/${id}/status`).set(as(key)).send({ status, ...(status === 'CANCELLED' && { reason: 'Teste' }) });

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = mod.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  http = request(await app.getUrl());

  await createRestaurant(A, 'rbac-a', [
    ['admin', 'ADMIN'], ['manager', 'MANAGER'], ['attendant', 'ATTENDANT'], ['kitchen', 'KITCHEN'], ['delivery', 'DELIVERY'],
    ['vitima', 'ATTENDANT'], ['senha', 'ATTENDANT'], ['papel', 'ATTENDANT'], ['bruteforce', 'ATTENDANT'],
  ]);
  await createRestaurant(B, 'rbac-b', [['admin', 'ADMIN']]);
  for (const k of ['admin', 'manager', 'attendant', 'kitchen', 'delivery']) cookies[k] = await login(A, k);
  cookies.bAdmin = await login(B, 'admin');
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

// ─── Sessão ───────────────────────────────────────────────────────────────────
describe('sessão por cookie HttpOnly', () => {
  it('login grava cookie HttpOnly, SameSite=Strict, Path=/api e NÃO devolve token no corpo', async () => {
    const res = await http.post('/api/auth/login').send({ email: 'admin@rbac-a.test', password: PASSWORD, restaurantSlug: 'rbac-a' });
    expect(res.status).toBe(200);
    const c = sessionCookie(res);
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/SameSite=Strict/i);
    expect(c).toMatch(/Path=\/api/i);
    const body = JSON.stringify(res.body);
    expect(res.body.accessToken).toBeUndefined();
    expect(body).not.toMatch(/eyJ[\w-]+\.[\w-]+\.[\w-]+/); // nenhum JWT no corpo
    expect(res.body.user).toMatchObject({ email: 'admin@rbac-a.test', role: 'ADMIN', restaurantSlug: 'rbac-a' });
  });

  it('/auth/me: 200 com o cookie; 401 sem cookie; token em Authorization não é aceito', async () => {
    const me = await http.get('/api/auth/me').set(as('manager'));
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ role: 'MANAGER', restaurantId: A.restaurantId });
    expect(me.body.password).toBeUndefined();
    expect((await http.get('/api/auth/me')).status).toBe(401);
    const raw = cookies.manager.replace('inx_session=', '');
    expect((await http.get('/api/auth/me').set('Authorization', `Bearer ${raw}`)).status).toBe(401);
  });

  it('cookie adulterado → 401', async () => {
    const [h, p, s] = cookies.manager.replace('inx_session=', '').split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), rid: B.restaurantId })).toString('base64url');
    expect((await http.get('/api/orders').set('Cookie', `inx_session=${h}.${forged}.${s}`)).status).toBe(401);
  });

  it('logout revoga a sessão (o mesmo cookie deixa de valer) e apaga o cookie', async () => {
    const c = await login(A, 'manager');
    const out = await http.post('/api/auth/logout').set('Cookie', c);
    expect(out.status).toBe(204);
    expect(sessionCookie(out)).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);
    expect((await http.get('/api/auth/me').set('Cookie', c)).status).toBe(401);
    // Outra sessão do mesmo usuário (outro aparelho) continua valendo
    expect((await http.get('/api/auth/me').set(as('manager'))).status).toBe(200);
  });

  it('usuário desativado perde o acesso na requisição seguinte', async () => {
    const c = await login(A, 'vitima');
    expect((await http.get('/api/orders').set('Cookie', c)).status).toBe(200);
    expect((await http.patch(`/api/users/${A.users.vitima}`).set(as('admin')).send({ active: false })).status).toBe(200);
    expect((await http.get('/api/orders').set('Cookie', c)).status).toBe(401);
    expect((await http.post('/api/auth/login').send({ email: 'vitima@rbac-a.test', password: PASSWORD, restaurantSlug: 'rbac-a' })).status).toBe(401);
  });

  it('senha alterada derruba as sessões; a senha nova funciona e a antiga não', async () => {
    const c = await login(A, 'senha');
    expect((await http.patch(`/api/users/${A.users.senha}`).set(as('admin')).send({ password: 'NovaSenha2026' })).status).toBe(200);
    expect((await http.get('/api/auth/me').set('Cookie', c)).status).toBe(401);
    expect((await http.post('/api/auth/login').send({ email: 'senha@rbac-a.test', password: PASSWORD, restaurantSlug: 'rbac-a' })).status).toBe(401);
    await login(A, 'senha', 'NovaSenha2026');
  });

  it('papel alterado: sessão antiga cai e a nova sessão já tem só as permissões do novo papel', async () => {
    const c = await login(A, 'papel');
    expect((await http.post('/api/orders').set('Cookie', c).send(newOrder(A, 'COUNTER'))).status).toBe(201);
    expect((await http.patch(`/api/users/${A.users.papel}`).set(as('admin')).send({ role: 'KITCHEN' })).status).toBe(200);
    expect((await http.post('/api/orders').set('Cookie', c).send(newOrder(A, 'COUNTER'))).status).toBe(401);
    const novo = await login(A, 'papel');
    expect((await http.post('/api/orders').set('Cookie', novo).send(newOrder(A, 'COUNTER'))).status).toBe(403);
    expect((await http.get('/api/auth/me').set('Cookie', novo)).body.role).toBe('KITCHEN');
  });

  it('senha nova fraca é recusada (400); a senha antiga da demo não serve para usuários novos', async () => {
    for (const password of ['curta1', 'admin123', 'semnumeroaqui', '1234567890']) {
      const r = await http.post('/api/users').set(as('admin')).send({ name: 'X', email: `x-${password}@rbac-a.test`, password, role: 'ATTENDANT' });
      expect(r.status).toBe(400);
    }
    expect((await http.post('/api/users').set(as('admin')).send({ name: 'X', email: 'forte@rbac-a.test', password: 'SenhaForte2026', role: 'ATTENDANT' })).status).toBe(201);
  });
});

// ─── Rate limit ───────────────────────────────────────────────────────────────
describe('limite de tentativas de login', () => {
  const attempt = (password: string, email = 'bruteforce@rbac-a.test') =>
    http.post('/api/auth/login').send({ email, password, restaurantSlug: 'rbac-a' });

  it(`após ${MAX_PER_ACCOUNT} senhas erradas: 429, inclusive com a senha certa`, async () => {
    for (let i = 0; i < MAX_PER_ACCOUNT; i++) expect((await attempt(`errada${i}`)).status).toBe(401);
    const blocked = await attempt('errada-de-novo');
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/Muitas tentativas/);
    expect(JSON.stringify(blocked.body)).not.toMatch(/senha incorreta|não existe|usuário/i);
    expect((await attempt(PASSWORD)).status).toBe(429);
  });

  it('outra conta do mesmo IP continua podendo entrar', async () => {
    expect((await http.post('/api/auth/login').send({ email: 'attendant@rbac-a.test', password: PASSWORD, restaurantSlug: 'rbac-a' })).status).toBe(200);
  });

  it('estabelecimento ou e-mail inexistente: mesma resposta genérica de senha errada', async () => {
    const a = await http.post('/api/auth/login').send({ email: 'ninguem@rbac-a.test', password: 'x', restaurantSlug: 'rbac-a' });
    const b = await http.post('/api/auth/login').send({ email: 'admin@rbac-a.test', password: 'x', restaurantSlug: 'nao-existe' });
    expect([a.status, b.status]).toEqual([401, 401]);
    expect(a.body.message).toBe(b.body.message);
  });
});

// ─── CSRF ─────────────────────────────────────────────────────────────────────
describe('verificação de origem (CSRF)', () => {
  it('POST com Origin de outro site → 403, nada criado', async () => {
    const before = await prisma.order.count({ where: { restaurantId: A.restaurantId } });
    const r = await http.post('/api/orders').set(as('admin')).set('Origin', 'https://site-malicioso.example').send(newOrder(A, 'COUNTER'));
    expect(r.status).toBe(403);
    expect(await prisma.order.count({ where: { restaurantId: A.restaurantId } })).toBe(before);
  });
  it('POST com Origin do web configurado → permitido', async () => {
    expect((await http.post('/api/orders').set(as('admin')).set('Origin', 'http://localhost:3000').send(newOrder(A, 'COUNTER'))).status).toBe(201);
  });
});

// ─── Isolamento entre restaurantes ────────────────────────────────────────────
describe('cookie do restaurante A não alcança o B', () => {
  it('pedido, mesa e usuário do B → 404 com a sessão do A', async () => {
    const bOrder = (await http.post('/api/orders').set(as('bAdmin')).send(newOrder(B, 'COUNTER'))).body;
    expect((await http.get(`/api/orders/${bOrder.id}`).set(as('admin'))).status).toBe(404);
    expect((await setStatus('admin', bOrder.id, 'CANCELLED')).status).toBe(404);
    expect((await http.patch(`/api/tables/${B.tableId}/status`).set(as('admin')).send({ status: 'OCCUPIED' })).status).toBe(404);
    expect((await http.patch(`/api/users/${B.users.admin}`).set(as('admin')).send({ name: 'x' })).status).toBe(404);
    const list = (await http.get('/api/orders').set(as('admin'))).body as Array<{ restaurantId: string }>;
    expect(list.every((o) => o.restaurantId === A.restaurantId)).toBe(true);
  });
});

// ─── Matriz operacional ───────────────────────────────────────────────────────
describe('matriz operacional de papéis', () => {
  it('criar pedido: KITCHEN e DELIVERY → 403; ATTENDANT → 201', async () => {
    expect((await http.post('/api/orders').set(as('kitchen')).send(newOrder(A, 'COUNTER'))).status).toBe(403);
    expect((await http.post('/api/orders').set(as('delivery')).send(newOrder(A, 'DELIVERY'))).status).toBe(403);
    expect((await http.post('/api/orders').set(as('attendant')).send(newOrder(A, 'COUNTER'))).status).toBe(201);
  });

  it('DELIVERY só vê pedidos do canal DELIVERY; balcão e mesa → 404', async () => {
    const counter = await createOrder('COUNTER');
    const dineIn = await createOrder('DINE_IN', { tableId: A.tableId });
    const delivery = await createOrder('DELIVERY', { deliveryAddress: 'Rua X, 1' });
    const list = (await http.get('/api/orders').set(as('delivery'))).body as Array<{ id: string; channel: string }>;
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((o) => o.channel === 'DELIVERY')).toBe(true);
    expect(list.map((o) => o.id)).toContain(delivery.id);
    // Filtro de canal enviado pelo cliente não amplia a visibilidade
    const tried = (await http.get('/api/orders?channel=COUNTER').set(as('delivery'))).body as Array<{ channel: string }>;
    expect(tried.every((o) => o.channel === 'DELIVERY')).toBe(true);
    for (const o of [counter, dineIn]) {
      expect((await http.get(`/api/orders/${o.id}`).set(as('delivery'))).status).toBe(404);
      expect((await setStatus('delivery', o.id, 'DELIVERED')).status).toBe(404);
    }
  });

  it('KITCHEN: RECEIVED→PREPARING→READY sim; entregar e cancelar → 403', async () => {
    const o = await createOrder('COUNTER');
    expect((await setStatus('kitchen', o.id, 'PREPARING')).status).toBe(200);
    expect((await setStatus('kitchen', o.id, 'CANCELLED')).status).toBe(403);
    expect((await setStatus('kitchen', o.id, 'READY')).status).toBe(200);
    expect((await setStatus('kitchen', o.id, 'DELIVERED')).status).toBe(403);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('READY');
  });

  it('DELIVERY no pedido de delivery: preparar → 403; READY→OUT_FOR_DELIVERY→DELIVERED → 200; cancelar → 403', async () => {
    const o = await createOrder('DELIVERY', { deliveryAddress: 'Rua Y, 2' });
    expect((await setStatus('delivery', o.id, 'PREPARING')).status).toBe(403);
    expect((await setStatus('delivery', o.id, 'CANCELLED')).status).toBe(403);
    expect((await setStatus('kitchen', o.id, 'PREPARING')).status).toBe(200);
    expect((await setStatus('kitchen', o.id, 'READY')).status).toBe(200);
    expect((await setStatus('delivery', o.id, 'OUT_FOR_DELIVERY')).status).toBe(200);
    expect((await setStatus('delivery', o.id, 'DELIVERED')).status).toBe(200);
  });

  it('ATTENDANT cancela só pedido RECEIVED; MANAGER cancela em preparo', async () => {
    const a = await createOrder('COUNTER');
    expect((await setStatus('attendant', a.id, 'CANCELLED')).status).toBe(200);
    const b = await createOrder('COUNTER');
    expect((await setStatus('attendant', b.id, 'PREPARING')).status).toBe(200);
    expect((await setStatus('attendant', b.id, 'CANCELLED')).status).toBe(403);
    expect((await setStatus('manager', b.id, 'CANCELLED')).status).toBe(200);
  });

  it('status inexistente → 400; transição inválida para quem pode → 400', async () => {
    const o = await createOrder('COUNTER');
    expect((await setStatus('admin', o.id, 'PAGO')).status).toBe(400);
    expect((await setStatus('admin', o.id, 'DELIVERED')).status).toBe(400); // RECEIVED não vai direto a DELIVERED
  });

  it('dashboard: faturamento só para ADMIN/MANAGER; demais recebem null', async () => {
    for (const k of ['admin', 'manager']) expect(typeof (await http.get('/api/orders/dashboard').set(as(k))).body.revenueToday).toBe('number');
    for (const k of ['attendant', 'kitchen', 'delivery']) {
      const r = await http.get('/api/orders/dashboard').set(as(k));
      expect(r.status).toBe(200);
      expect(r.body.revenueToday).toBeNull();
    }
    const d = (await http.get('/api/orders/dashboard').set(as('delivery'))).body as { recentOrders: Array<{ channel: string }> };
    expect(d.recentOrders.every((o) => o.channel === 'DELIVERY')).toBe(true);
  });

  it('relatórios e histórico: só ADMIN/MANAGER', async () => {
    const q = '/api/reports/sales?startDate=2026-01-01&endDate=2026-12-31';
    for (const k of ['attendant', 'kitchen', 'delivery']) {
      expect((await http.get(q).set(as(k))).status).toBe(403);
      expect((await http.get('/api/reports/history').set(as(k))).status).toBe(403);
    }
    expect((await http.get(q).set(as('manager'))).status).toBe(200);
    expect((await http.get('/api/reports/history').set(as('manager'))).status).toBe(200);
  });

  it('cozinha/produção: DELIVERY → 403; KITCHEN e ATTENDANT → 200', async () => {
    expect((await http.get('/api/kitchen/queue').set(as('delivery'))).status).toBe(403);
    expect((await http.get('/api/kitchen/queue').set(as('kitchen'))).status).toBe(200);
    expect((await http.get('/api/kitchen/queue').set(as('attendant'))).status).toBe(200);
  });

  it('mesas: DELIVERY não consulta; KITCHEN consulta mas não altera; ATTENDANT altera', async () => {
    expect((await http.get('/api/tables').set(as('delivery'))).status).toBe(403);
    expect((await http.get('/api/tables').set(as('kitchen'))).status).toBe(200);
    expect((await http.patch(`/api/tables/${A.tableId}/status`).set(as('kitchen')).send({ status: 'AVAILABLE' })).status).toBe(403);
    expect((await http.patch(`/api/tables/${A.tableId}/status`).set(as('attendant')).send({ status: 'AVAILABLE' })).status).toBe(200);
  });
});
