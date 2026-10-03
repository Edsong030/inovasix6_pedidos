/**
 * Testes HTTP do webhook Anota AI: assinatura HMAC antes de gravar, idempotência,
 * modos ativo/sem segredo/desativado e ausência de dados sensíveis nos logs.
 */
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { signPayload } from '../src/integrations/anota-ai/webhook-signature';

const SECRET = 'segredo-webhook-e2e-7f3a9c';
const MARKER = 'MARCADOR-SENSIVEL-DO-PAYLOAD';
const prisma = new PrismaClient();
let restaurantId: string;

async function startApp(env: { enabled: boolean; secret: string }) {
  process.env.ANOTA_AI_ENABLED = env.enabled ? 'true' : 'false';
  process.env.ANOTA_AI_WEBHOOK_SECRET = env.secret;
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  return { app, http: request(await app.getUrl()) };
}

const body = (orderId: string | undefined, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ ...(orderId !== undefined && { orderId }), customer: { phone: MARKER }, total: 42.5, ...extra });
const post = (http: ReturnType<typeof request>, raw: string, signature?: string, rid = restaurantId, kind = 'order-placed') => {
  const r = http.post(`/api/integrations/anota-ai/webhook/${rid}/${kind}`).set('Content-Type', 'application/json');
  if (signature !== undefined) r.set('x-anota-signature', signature);
  return r.send(raw);
};
const events = () => prisma.anotaAiEvent.count({ where: { restaurantId } });

// Captura toda mensagem de log (em qualquer nível: o logger dos testes do Nest só imprime
// erros, então as chamadas são interceptadas no Logger) e tudo o que vai para stdout/stderr
const logged: string[] = [];
const spies: jest.SpyInstance[] = [];

beforeAll(async () => {
  restaurantId = (await prisma.restaurant.create({ data: { slug: 'webhook-e2e', name: 'Webhook E2E' } })).id;
  for (const level of ['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const) {
    const orig = Logger.prototype[level];
    spies.push(jest.spyOn(Logger.prototype, level).mockImplementation(function (this: Logger, ...args: unknown[]) {
      logged.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
      return (orig as (...a: unknown[]) => void).apply(this, args);
    }));
  }
  for (const stream of [process.stdout, process.stderr]) {
    const orig = stream.write.bind(stream);
    spies.push(jest.spyOn(stream, 'write').mockImplementation(((chunk: unknown, ...rest: unknown[]) => {
      logged.push(String(chunk));
      return (orig as (...a: unknown[]) => boolean)(chunk, ...rest);
    }) as never));
  }
});

afterAll(async () => {
  spies.forEach((s) => s.mockRestore());
  await prisma.$disconnect();
});

describe('integração ATIVA com segredo', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof request>;
  beforeAll(async () => ({ app, http } = await startApp({ enabled: true, secret: SECRET })));
  afterAll(() => app.close());

  it('assinatura válida → 200 processado e 1 evento gravado', async () => {
    const raw = body('A-100');
    const res = await post(http, raw, signPayload(SECRET, raw));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ processed: true });
    expect(await events()).toBe(1);
  });

  it('formato "sha256=<hex>" também é aceito', async () => {
    const raw = body('A-101');
    expect((await post(http, raw, `sha256=${signPayload(SECRET, raw)}`)).status).toBe(200);
  });

  it.each([
    ['ausente', undefined],
    ['vazia', ''],
    ['inválida (hex errado)', 'f'.repeat(64)],
    ['malformada', 'nao-e-hex'],
    ['feita com outro segredo', signPayload('outro-segredo', body('A-200'))],
  ])('assinatura %s → 401 e nada gravado', async (_, sig) => {
    const before = await events();
    const res = await post(http, body('A-200'), sig);
    expect(res.status).toBe(401);
    expect(await events()).toBe(before);
  });

  it('HMAC sobre os bytes crus recebidos (antes do parse): JSON reserializado não vale', async () => {
    // Mesmo conteúdo lógico, bytes diferentes: espaços, quebra de linha e ordem das chaves
    const raw = '{ "total": 42.5,\n  "orderId": "RAW-1",   "customer": { "phone": "x" } }';
    const reserialized = JSON.stringify(JSON.parse(raw));
    expect(reserialized).not.toBe(raw);
    const before = await events();
    expect((await post(http, raw, signPayload(SECRET, reserialized))).status).toBe(401);
    expect(await events()).toBe(before);
    expect((await post(http, raw, signPayload(SECRET, raw))).status).toBe(200);
    expect(await prisma.anotaAiEvent.count({ where: { restaurantId, externalId: 'RAW-1' } })).toBe(1);
  });

  it('payload adulterado depois de assinado → 401 e nada gravado', async () => {
    const before = await events();
    const original = body('A-300');
    const tampered = body('A-300', { total: 0.01 });
    expect((await post(http, tampered, signPayload(SECRET, original))).status).toBe(401);
    expect(await events()).toBe(before);
  });

  it('idempotência: o mesmo evento reenviado não duplica nem altera o original', async () => {
    const raw = body('A-400');
    const sig = signPayload(SECRET, raw);
    expect((await post(http, raw, sig)).body).toMatchObject({ processed: true });
    const original = await prisma.anotaAiEvent.findFirstOrThrow({ where: { restaurantId, externalId: 'A-400' } });
    const again = await post(http, raw, sig);
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ duplicate: true, eventId: original.id });
    const after = await prisma.anotaAiEvent.findMany({ where: { restaurantId, externalId: 'A-400' } });
    expect(after).toHaveLength(1);
    expect(after[0].status).toBe('PROCESSED'); // não vira DUPLICATE
  });

  it('idempotência sob concorrência: 8 envios simultâneos → 1 processado, 7 duplicados, 1 linha', async () => {
    const raw = body('A-500');
    const sig = signPayload(SECRET, raw);
    const results = await Promise.all(Array.from({ length: 8 }, () => post(http, raw, sig)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results.filter((r) => r.body.processed)).toHaveLength(1);
    expect(results.filter((r) => r.body.duplicate)).toHaveLength(7);
    expect(await prisma.anotaAiEvent.count({ where: { restaurantId, externalId: 'A-500' } })).toBe(1);
  });

  it('mesmo pedido, eventos diferentes (criado/cancelado) são registros distintos', async () => {
    const raw = body('A-600');
    expect((await post(http, raw, signPayload(SECRET, raw))).status).toBe(200);
    expect((await post(http, raw, signPayload(SECRET, raw), restaurantId, 'order-cancelled')).body).toMatchObject({ processed: true });
    expect(await prisma.anotaAiEvent.count({ where: { restaurantId, externalId: { in: ['A-600', 'cnl_A-600'] } } })).toBe(2);
  });

  it('assinado mas sem id do pedido → 400 e nada gravado', async () => {
    const before = await events();
    const raw = body(undefined);
    expect((await post(http, raw, signPayload(SECRET, raw))).status).toBe(400);
    expect(await events()).toBe(before);
  });

  it('assinado para restaurante inexistente → 404', async () => {
    const raw = body('A-700');
    expect((await post(http, raw, signPayload(SECRET, raw), 'nao-existe')).status).toBe(404);
  });
});

describe('integração ATIVA sem segredo', () => {
  it('→ 403 e nada gravado, mesmo com "assinatura"', async () => {
    const { app, http } = await startApp({ enabled: true, secret: '' });
    const before = await events();
    const raw = body('B-100');
    expect((await post(http, raw, signPayload('', raw))).status).toBe(403);
    expect((await post(http, raw)).status).toBe(403);
    expect(await events()).toBe(before);
    await app.close();
  });
});

describe('integração DESATIVADA (padrão)', () => {
  it('responde "ignorado" e não grava nada, com ou sem assinatura', async () => {
    const { app, http } = await startApp({ enabled: false, secret: SECRET });
    const before = await events();
    const raw = body('C-100');
    for (const sig of [undefined, 'lixo', signPayload(SECRET, raw)]) {
      const res = await post(http, raw, sig);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ignored: true, reason: 'integration_disabled' });
    }
    expect(await events()).toBe(before);
    await app.close();
  });
});

describe('logs', () => {
  it('nenhum log contém payload, assinatura ou segredo', () => {
    const all = logged.join('\n');
    expect(all).toMatch(/assinatura ausente ou inválida/); // os logs de recusa existiram
    expect(all).not.toContain(MARKER);
    expect(all).not.toContain(SECRET);
    expect(all).not.toContain(signPayload(SECRET, body('A-100')));
    expect(all).not.toContain('f'.repeat(64));
  });
});
