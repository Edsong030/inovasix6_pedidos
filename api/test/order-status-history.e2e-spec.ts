/**
 * Testes HTTP do histórico de status de pedidos (OrderStatusHistory):
 *   • cada mudança bem-sucedida grava de → para, quem fez e o motivo;
 *   • cancelamento exige motivo (ausente, vazio ou só espaços → 400);
 *   • 400, 403, 404 e 409 não gravam histórico (nem pela metade);
 *   • histórico, status, timestamps e mesa na mesma transação.
 */
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PASSWORD = 'SenhaDeTeste123';
const SLUG = 'rest-historico';
const prisma = new PrismaClient();
let app: NestExpressApplication;
let http: ReturnType<typeof request>;
let restaurantId: string;
let productId: string;
const users: Record<string, string> = {};
const cookies: Record<string, string> = {};

type Body = { id: string; status: string; message?: string | string[] };

beforeAll(async () => {
  const mod = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = mod.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  http = request(await app.getUrl());

  restaurantId = (
    await prisma.restaurant.create({ data: { slug: SLUG, name: SLUG } })
  ).id;
  const hash = await bcrypt.hash(PASSWORD, 4);
  const roles: Array<[string, UserRole]> = [
    ['admin', 'ADMIN'],
    ['manager', 'MANAGER'],
    ['kitchen', 'KITCHEN'],
  ];
  for (const [key, role] of roles) {
    users[key] = (
      await prisma.user.create({
        data: {
          restaurantId,
          name: key,
          email: `${key}@${SLUG}.test`,
          password: hash,
          role,
        },
      })
    ).id;
    const res = await http.post('/api/auth/login').send({
      email: `${key}@${SLUG}.test`,
      password: PASSWORD,
      restaurantSlug: SLUG,
    });
    expect(res.status).toBe(200);
    const set = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    cookies[key] = set.find((c) => c.startsWith('inx_session='))!.split(';')[0];
  }
  const cat = await prisma.category.create({
    data: { restaurantId, name: 'Pratos' },
  });
  productId = (
    await prisma.product.create({
      data: { restaurantId, categoryId: cat.id, name: 'Prato', price: 10 },
    })
  ).id;
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

async function createOrder(extra: Record<string, unknown> = {}) {
  const res = await http
    .post('/api/orders')
    .set({ Cookie: cookies.admin })
    .send({
      channel: 'COUNTER',
      paymentMethod: 'PIX',
      items: [{ productId, quantity: 1 }],
      ...extra,
    });
  expect(res.status).toBe(201);
  return res.body as Body;
}
/** PATCH de status com o corpo exato informado (sem completar motivo). */
const patch = (id: string, body: object, as = 'admin') =>
  http
    .patch(`/api/orders/${id}/status`)
    .set({ Cookie: cookies[as] })
    .send(body);
const history = (orderId: string) =>
  prisma.orderStatusHistory.findMany({
    where: { orderId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
const firstMessage = (res: request.Response) => {
  const m = (res.body as Body).message;
  return Array.isArray(m) ? m[0] : m;
};

/** Espera até `n` sessões do banco estarem paradas aguardando um bloqueio de linha. */
async function waitForLockWaits(n: number, deadlineMs = 10_000) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const [{ waiting }] = await prisma.$queryRaw<Array<{ waiting: number }>>`
      SELECT count(*)::int AS waiting FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock'
        AND pid <> pg_backend_pid()`;
    if (waiting >= n) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`As requisições não chegaram a esperar o bloqueio (${n})`);
}

/**
 * Abre uma transação que segura um bloqueio. Use `await held` antes de disparar as
 * requisições: sem isso, uma delas pode chegar ao banco antes do bloqueio, gravar e
 * sair, e a corrida não acontece (foi o que deixava o teste instável no CI).
 */
function holdLock(
  work: (
    tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  ) => Promise<unknown>,
) {
  let release!: () => void;
  let markHeld!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const acquired = new Promise<void>((r) => {
    markHeld = r;
  });
  const done = prisma.$transaction(
    async (tx) => {
      await work(tx);
      markHeld();
      await gate;
    },
    { timeout: 20_000 },
  );
  return {
    // Rejeita junto se a transação falhar antes de obter o bloqueio
    held: Promise.race([acquired, done.then(() => undefined)]),
    /** Libera quando `n` requisições estiverem presas no bloqueio; em falha, libera também. */
    async releaseWhenWaiting(n: number) {
      try {
        await waitForLockWaits(n);
      } finally {
        release();
        await done;
      }
    },
  };
}

describe('histórico: mudanças registradas', () => {
  let orderId: string;

  it('A/G — RECEIVED → PREPARING sem motivo: pedido alterado e 1 histórico do executor', async () => {
    orderId = (await createOrder()).id;
    const res = await patch(orderId, { status: 'PREPARING' }, 'admin');
    expect(res.status).toBe(200);
    expect((res.body as Body).status).toBe('PREPARING');

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.status).toBe('PREPARING');
    expect(order.prepStartedAt).not.toBeNull();

    const h = await history(orderId);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({
      orderId,
      fromStatus: 'RECEIVED',
      toStatus: 'PREPARING',
      userId: users.admin,
      reason: null,
    });
    expect(h[0].createdAt).toBeInstanceOf(Date);
    // O criador do pedido continua em Order.userId (não é reaproveitado)
    expect(order.userId).toBe(users.admin);
  });

  it('B — PREPARING → READY por outro usuário: 2º histórico, o 1º intacto e em ordem', async () => {
    const before = await history(orderId);
    const res = await patch(orderId, { status: 'READY' }, 'kitchen');
    expect(res.status).toBe(200);

    const h = await history(orderId);
    expect(h).toHaveLength(2);
    expect(h[0]).toEqual(before[0]);
    expect(h[1]).toMatchObject({
      fromStatus: 'PREPARING',
      toStatus: 'READY',
      userId: users.kitchen,
      reason: null,
    });
    expect(h[1].createdAt.getTime()).toBeGreaterThanOrEqual(
      h[0].createdAt.getTime(),
    );
    expect(h.map((x) => `${x.fromStatus}>${x.toStatus}`)).toEqual([
      'RECEIVED>PREPARING',
      'PREPARING>READY',
    ]);
  });

  it('motivo opcional numa transição normal é gravado (aparado)', async () => {
    const o = await createOrder();
    const res = await patch(o.id, {
      status: 'PREPARING',
      reason: '  Prioridade  ',
    });
    expect(res.status).toBe(200);
    expect((await history(o.id))[0].reason).toBe('Prioridade');
  });
});

describe('histórico: cancelamento com motivo obrigatório', () => {
  it.each([
    ['C — sem reason', { status: 'CANCELLED' }],
    ['D — reason vazio', { status: 'CANCELLED', reason: '' }],
    ['E — reason só com espaços', { status: 'CANCELLED', reason: '   ' }],
    ['reason null', { status: 'CANCELLED', reason: null }],
    [
      'reason acima de 500 caracteres',
      { status: 'CANCELLED', reason: 'x'.repeat(501) },
    ],
  ])('%s → 400, pedido e histórico intactos', async (_, body) => {
    const o = await createOrder();
    const res = await patch(o.id, body, 'manager');
    expect(res.status).toBe(400);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(order.status).toBe('RECEIVED');
    expect(order.cancelledAt).toBeNull();
    expect(await history(o.id)).toHaveLength(0);
  });

  it('mensagem do motivo ausente é clara', async () => {
    const o = await createOrder();
    const res = await patch(o.id, { status: 'CANCELLED' });
    expect(firstMessage(res)).toBe('Informe o motivo do cancelamento');
  });

  it('F — cancelamento válido: CANCELLED, cancelledAt, histórico com motivo e executor', async () => {
    const o = await createOrder();
    const res = await patch(
      o.id,
      { status: 'CANCELLED', reason: '  Cliente desistiu  ' },
      'manager',
    );
    expect(res.status).toBe(200);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(order.status).toBe('CANCELLED');
    expect(order.cancelledAt).not.toBeNull();
    const h = await history(o.id);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({
      fromStatus: 'RECEIVED',
      toStatus: 'CANCELLED',
      userId: users.manager,
      reason: 'Cliente desistiu',
    });
  });
});

describe('histórico: erros não gravam nada', () => {
  it('I — transição inválida → 400 sem novo histórico', async () => {
    const o = await createOrder();
    expect((await patch(o.id, { status: 'DELIVERED' })).status).toBe(400);
    expect(await history(o.id)).toHaveLength(0);
  });

  it('J — perfil sem permissão → 403 sem novo histórico', async () => {
    const o = await createOrder();
    const res = await patch(
      o.id,
      { status: 'CANCELLED', reason: 'Tentativa da cozinha' },
      'kitchen',
    );
    expect(res.status).toBe(403);
    expect(await history(o.id)).toHaveLength(0);
  });

  it('K — estado final (DELIVERED e CANCELLED) não aceita nova mudança nem gera histórico', async () => {
    const delivered = await createOrder();
    for (const s of ['PREPARING', 'READY', 'DELIVERED']) {
      expect((await patch(delivered.id, { status: s })).status).toBe(200);
    }
    expect(await history(delivered.id)).toHaveLength(3);
    expect((await patch(delivered.id, { status: 'PREPARING' })).status).toBe(
      400,
    );
    expect(
      (
        await patch(delivered.id, {
          status: 'CANCELLED',
          reason: 'Tarde demais',
        })
      ).status,
    ).toBe(400);
    expect(await history(delivered.id)).toHaveLength(3);

    const cancelled = await createOrder();
    expect(
      (
        await patch(cancelled.id, {
          status: 'CANCELLED',
          reason: 'Erro de lançamento',
        })
      ).status,
    ).toBe(200);
    expect((await patch(cancelled.id, { status: 'READY' })).status).toBe(400);
    expect(
      (await patch(cancelled.id, { status: 'CANCELLED', reason: 'De novo' }))
        .status,
    ).toBe(400);
    expect(await history(cancelled.id)).toHaveLength(1);
  });

  it('pedido inexistente → 404 sem histórico', async () => {
    const before = await prisma.orderStatusHistory.count();
    expect(
      (await patch('pedido-inexistente', { status: 'PREPARING' })).status,
    ).toBe(404);
    expect(await prisma.orderStatusHistory.count()).toBe(before);
  });
});

describe('histórico: concorrência e atomicidade', () => {
  it('H — READY e CANCELLED simultâneos: um vence, o outro 409 e só o histórico do vencedor', async () => {
    const o = await createOrder();
    expect((await patch(o.id, { status: 'PREPARING' })).status).toBe(200);

    // Segura a linha do pedido: as duas leem PREPARING e esperam na gravação
    const lock = holdLock(
      (tx) => tx.$queryRaw`SELECT id FROM orders WHERE id = ${o.id} FOR UPDATE`,
    );
    await lock.held;
    const ready = patch(o.id, { status: 'READY' }, 'kitchen').then((r) => r);
    const cancel = patch(
      o.id,
      { status: 'CANCELLED', reason: 'Disputa' },
      'manager',
    ).then((r) => r);
    await lock.releaseWhenWaiting(2);

    const results = [await ready, await cancel];
    const winner = results.find((r) => r.status === 200);
    const loser = results.find((r) => r.status !== 200);
    expect(winner).toBeDefined();
    expect(loser?.status).toBe(409);

    const h = await history(o.id);
    // PREPARING inicial + apenas a mudança vencedora
    expect(h).toHaveLength(2);
    expect(h[1].fromStatus).toBe('PREPARING');
    expect(h[1].toStatus).toBe((winner!.body as Body).status);
    expect(h[1].userId).toBe(
      (winner!.body as Body).status === 'READY' ? users.kitchen : users.manager,
    );
  });

  it('409 em pedido com mesa: sem histórico, sem timestamp e a mesa continua ocupada', async () => {
    const table = await prisma.table.create({
      data: { restaurantId, number: 'H1' },
    });
    const o = await createOrder({ channel: 'DINE_IN', tableId: table.id });

    // Outra operação (fora da API) leva o pedido a PREPARING durante o cancelamento
    const other = holdLock((tx) =>
      tx.order.update({
        where: { id: o.id },
        data: { status: 'PREPARING', prepStartedAt: new Date() },
      }),
    );
    await other.held;
    const pending = patch(o.id, {
      status: 'CANCELLED',
      reason: 'Cliente saiu',
    }).then((r) => r);
    await other.releaseWhenWaiting(1);

    expect((await pending).status).toBe(409);
    expect(await history(o.id)).toHaveLength(0);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(order.status).toBe('PREPARING');
    expect(order.cancelledAt).toBeNull();
    expect(
      (await prisma.table.findUniqueOrThrow({ where: { id: table.id } }))
        .status,
    ).toBe('OCCUPIED');
  });

  it('cancelar o último pedido da mesa: histórico e mesa liberada juntos', async () => {
    const table = await prisma.table.create({
      data: { restaurantId, number: 'H2' },
    });
    const o = await createOrder({ channel: 'DINE_IN', tableId: table.id });
    const res = await patch(o.id, {
      status: 'CANCELLED',
      reason: 'Mesa desistiu',
    });
    expect(res.status).toBe(200);
    expect(await history(o.id)).toHaveLength(1);
    expect(
      (await prisma.table.findUniqueOrThrow({ where: { id: table.id } }))
        .status,
    ).toBe('AVAILABLE');
  });
});
