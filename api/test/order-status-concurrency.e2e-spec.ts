/**
 * Testes HTTP da alteração de status de pedidos (transação única + gravação condicional):
 *   • duas alterações simultâneas a partir do mesmo status: uma vence, a outra recebe 409;
 *   • códigos preservados: 404 (pedido inexistente), 400 (transição inválida), 403 (perfil);
 *   • status e timestamps sempre coerentes;
 *   • mesa liberada só quando o último pedido ativo é encerrado, inclusive sob concorrência.
 *
 * Para forçar a corrida no ponto exato, o próprio teste segura o bloqueio da linha numa
 * transação do banco e só a confirma quando as requisições já estão esperando por ele.
 */
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { OrderStatus, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PASSWORD = 'SenhaDeTeste123';
const SLUG = 'rest-status';
const CONFLICT_MESSAGE =
  'O pedido foi alterado por outra operação. Atualize os dados e tente novamente.';
const prisma = new PrismaClient();
let app: NestExpressApplication;
let http: ReturnType<typeof request>;
let restaurantId: string;
let productId: string;
const users: Record<string, string> = {};
const cookies: Record<string, string> = {};

type Body = { id: string; status: OrderStatus; message?: string };

async function login(key: string) {
  const res = await http.post('/api/auth/login').send({
    email: `${key}@${SLUG}.test`,
    password: PASSWORD,
    restaurantSlug: SLUG,
  });
  expect(res.status).toBe(200);
  const set = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return set.find((c) => c.startsWith('inx_session='))!.split(';')[0];
}

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
  for (const [key, role] of [
    ['admin', 'ADMIN'],
    ['kitchen', 'KITCHEN'],
  ] as Array<[string, UserRole]>) {
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
    cookies[key] = await login(key);
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
const setStatus = (id: string, status: string, as = 'admin') =>
  http
    .patch(`/api/orders/${id}/status`)
    .set({ Cookie: cookies[as] })
    // Cancelar exige motivo (DTO); aqui o foco é a concorrência
    .send({ status, ...(status === 'CANCELLED' && { reason: 'Teste' }) });
const body = (res: request.Response) => res.body as Body;
const tableStatus = async (id: string) =>
  (await prisma.table.findUniqueOrThrow({ where: { id } })).status;

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

/** Status final e timestamps nunca de um estado incompatível com ele. */
function expectCoherent(o: {
  status: OrderStatus;
  prepStartedAt: Date | null;
  readyAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
}) {
  if (o.status !== 'CANCELLED') expect(o.cancelledAt).toBeNull();
  if (o.status !== 'DELIVERED') expect(o.deliveredAt).toBeNull();
  if (o.status === 'RECEIVED') expect(o.prepStartedAt).toBeNull();
  if (o.status === 'RECEIVED' || o.status === 'PREPARING')
    expect(o.readyAt).toBeNull();
}

describe('status de pedido: concorrência', () => {
  it('READY e CANCELLED simultâneos a partir de PREPARING: só um vence, o outro recebe 409', async () => {
    const o = await createOrder();
    expect((await setStatus(o.id, 'PREPARING')).status).toBe(200);

    // Segura a linha do pedido (sem alterá-la): as duas requisições leem PREPARING,
    // validam e ficam esperando na gravação
    const lock = holdLock(
      (tx) => tx.$queryRaw`SELECT id FROM orders WHERE id = ${o.id} FOR UPDATE`,
    );
    await lock.held;
    const ready = setStatus(o.id, 'READY').then((r) => r);
    const cancel = setStatus(o.id, 'CANCELLED').then((r) => r);
    await lock.releaseWhenWaiting(2);

    const results = [await ready, await cancel];
    const winners = results.filter((r) => r.status === 200);
    const losers = results.filter((r) => r.status !== 200);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0].status).toBe(409);
    expect(body(losers[0]).message).toBe(CONFLICT_MESSAGE);

    const final = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(final.status).toBe(body(winners[0]).status);
    expectCoherent(final);
  });

  it('alteração concorrente gravada entre a leitura e a escrita: 409 e nada é sobrescrito', async () => {
    const o = await createOrder();
    expect((await setStatus(o.id, 'PREPARING')).status).toBe(200);

    // Outra operação leva o pedido a READY e segura a linha sem confirmar
    const other = holdLock((tx) =>
      tx.order.update({
        where: { id: o.id },
        data: { status: 'READY', readyAt: new Date() },
      }),
    );
    await other.held;
    const pending = setStatus(o.id, 'CANCELLED').then((r) => r);
    await other.releaseWhenWaiting(1);

    const res = await pending;
    expect(res.status).toBe(409);
    expect(body(res).message).toBe(CONFLICT_MESSAGE);
    const final = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(final.status).toBe('READY');
    expect(final.cancelledAt).toBeNull();
  });

  it('várias requisições READY/CANCELLED juntas: status e timestamps sempre coerentes', async () => {
    const o = await createOrder();
    expect((await setStatus(o.id, 'PREPARING')).status).toBe(200);

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        setStatus(o.id, i % 2 ? 'CANCELLED' : 'READY'),
      ),
    );
    // Quem perde recebe 409 (leu o estado antigo) ou 400 (já leu o novo estado)
    for (const r of results) expect([200, 400, 409]).toContain(r.status);
    const oks = results.filter((r) => r.status === 200);
    expect(oks.length).toBeGreaterThanOrEqual(1);
    // No máximo PREPARING → READY → CANCELLED: duas transições efetivas
    expect(oks.length).toBeLessThanOrEqual(2);

    const final = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expectCoherent(final);
    expect(oks.some((r) => body(r).status === final.status)).toBe(true);
  });
});

describe('status de pedido: comportamento preservado', () => {
  it('fluxo válido RECEIVED → PREPARING → READY → DELIVERED com timestamps', async () => {
    const o = await createOrder();
    for (const s of ['PREPARING', 'READY', 'DELIVERED']) {
      const res = await setStatus(o.id, s);
      expect(res.status).toBe(200);
      expect(body(res).status).toBe(s);
    }
    const final = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(final.prepStartedAt).not.toBeNull();
    expect(final.readyAt).not.toBeNull();
    expect(final.deliveredAt).not.toBeNull();
    expect(final.cancelledAt).toBeNull();
  });

  it('transição inválida → 400 e o pedido não muda', async () => {
    const o = await createOrder();
    const res = await setStatus(o.id, 'DELIVERED'); // RECEIVED não vai direto a DELIVERED
    expect(res.status).toBe(400);
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status,
    ).toBe('RECEIVED');
  });

  it('estado final não aceita nova transição (400)', async () => {
    const delivered = await createOrder();
    for (const s of ['PREPARING', 'READY', 'DELIVERED'])
      await setStatus(delivered.id, s);
    expect((await setStatus(delivered.id, 'PREPARING')).status).toBe(400);
    expect((await setStatus(delivered.id, 'CANCELLED')).status).toBe(400);

    const cancelled = await createOrder();
    expect((await setStatus(cancelled.id, 'CANCELLED')).status).toBe(200);
    expect((await setStatus(cancelled.id, 'READY')).status).toBe(400);
    expect((await setStatus(cancelled.id, 'CANCELLED')).status).toBe(400);

    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: delivered.id } }))
        .status,
    ).toBe('DELIVERED');
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: cancelled.id } }))
        .status,
    ).toBe('CANCELLED');
  });

  it('pedido inexistente → 404; perfil sem permissão → 403', async () => {
    expect((await setStatus('pedido-que-nao-existe', 'PREPARING')).status).toBe(
      404,
    );
    const o = await createOrder();
    expect((await setStatus(o.id, 'CANCELLED', 'kitchen')).status).toBe(403);
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status,
    ).toBe('RECEIVED');
  });
});

describe('status de pedido: mesa', () => {
  it('encerrar o último pedido ativo libera a mesa; com outro ativo ela continua ocupada', async () => {
    const table = await prisma.table.create({
      data: { restaurantId, number: 'T1' },
    });
    const a = await createOrder({ channel: 'DINE_IN', tableId: table.id });
    const b = await createOrder({ channel: 'DINE_IN', tableId: table.id });
    expect(await tableStatus(table.id)).toBe('OCCUPIED');

    expect((await setStatus(a.id, 'CANCELLED')).status).toBe(200);
    expect(await tableStatus(table.id)).toBe('OCCUPIED');

    for (const s of ['PREPARING', 'READY', 'DELIVERED']) {
      expect((await setStatus(b.id, s)).status).toBe(200);
    }
    expect(await tableStatus(table.id)).toBe('AVAILABLE');
  });

  it('conflito ao encerrar (409): a transação é desfeita e a mesa continua ocupada', async () => {
    const table = await prisma.table.create({
      data: { restaurantId, number: 'T2' },
    });
    const o = await createOrder({ channel: 'DINE_IN', tableId: table.id });

    // Outra operação leva o pedido a PREPARING durante a tentativa de cancelar
    const other = holdLock((tx) =>
      tx.order.update({
        where: { id: o.id },
        data: { status: 'PREPARING', prepStartedAt: new Date() },
      }),
    );
    await other.held;
    const pending = setStatus(o.id, 'CANCELLED').then((r) => r);
    await other.releaseWhenWaiting(1);

    expect((await pending).status).toBe(409);
    expect(await tableStatus(table.id)).toBe('OCCUPIED');
  });

  it('pedido novo criado durante o encerramento de outro: a mesa continua ocupada', async () => {
    const table = await prisma.table.create({
      data: { restaurantId, number: 'T3' },
    });
    const a = await createOrder({ channel: 'DINE_IN', tableId: table.id });

    // Uma criação na mesma mesa (como a de OrdersService.create) ainda não confirmada:
    // pedido gravado e mesa bloqueada
    const creation = holdLock(async (tx) => {
      const { orderSeq } = await tx.restaurant.update({
        where: { id: restaurantId },
        data: { orderSeq: { increment: 1 } },
        select: { orderSeq: true },
      });
      await tx.order.create({
        data: {
          restaurantId,
          userId: users.admin,
          tableId: table.id,
          orderNumber: orderSeq,
          channel: 'DINE_IN',
          paymentMethod: 'PIX',
          subtotal: 10,
          total: 10,
        },
      });
      await tx.table.update({
        where: { id: table.id },
        data: { status: 'OCCUPIED' },
      });
    });

    // Encerrar o pedido A espera a mesa; depois enxerga o pedido novo e não libera
    await creation.held;
    const pending = setStatus(a.id, 'CANCELLED').then((r) => r);
    await creation.releaseWhenWaiting(1);

    expect((await pending).status).toBe(200);
    expect(await tableStatus(table.id)).toBe('OCCUPIED');
    const active = await prisma.order.count({
      where: {
        tableId: table.id,
        status: { in: ['RECEIVED', 'PREPARING', 'READY'] },
      },
    });
    expect(active).toBe(1);
  });
});
