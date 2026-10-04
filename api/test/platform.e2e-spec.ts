/**
 * Testes HTTP da área da plataforma (PLATFORM_ADMIN):
 *   • só o PLATFORM_ADMIN do estabelecimento interno da plataforma acessa /platform;
 *   • cadastro cria estabelecimento + primeiro ADMIN na mesma transação, com o
 *     restaurantId gerado pelo servidor;
 *   • o novo ADMIN fica restrito ao próprio estabelecimento;
 *   • PLATFORM_ADMIN não acessa a operação de nenhum estabelecimento;
 *   • inativar encerra as sessões e bloqueia o login; reativar devolve o acesso.
 */
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PASSWORD = 'SenhaDeTeste123';
const VALID_CNPJ = '11222333000181';
const VALID_CPF = '52998224725';
const prisma = new PrismaClient();
let app: NestExpressApplication;
let http: ReturnType<typeof request>;

const ids: Record<string, string> = {};
const cookies: Record<string, string> = {};

type Establishment = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  document: string;
  users: Array<{ email: string }>;
};

async function login(email: string, slug: string, password = PASSWORD) {
  return http
    .post('/api/auth/login')
    .send({ email, password, restaurantSlug: slug });
}
function cookieOf(res: request.Response) {
  expect(res.status).toBe(200);
  const set = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return set.find((c) => c.startsWith('inx_session='))!.split(';')[0];
}
const as = (key: string) => ({ Cookie: cookies[key] });

async function createUser(restaurantId: string, key: string, role: UserRole) {
  const hash = await bcrypt.hash(PASSWORD, 4);
  return (
    await prisma.user.create({
      data: {
        restaurantId,
        name: key,
        email: `${key}@plat.test`,
        password: hash,
        role,
      },
    })
  ).id;
}

/** Corpo válido de cadastro; `extra` sobrescreve campos. */
const establishment = (slug: string, extra: Record<string, unknown> = {}) => ({
  name: 'Pizzaria do João',
  slug,
  businessType: 'RESTAURANT',
  document: VALID_CNPJ,
  ownerName: 'João da Silva',
  email: 'contato@pizzaria.test',
  phone: '11987654321',
  zipCode: '01001-000',
  street: 'Praça da Sé',
  number: '100',
  city: 'São Paulo',
  state: 'sp',
  admin: {
    name: 'João Admin',
    email: `admin@${slug}.test`,
    password: 'SenhaInicial123',
  },
  ...extra,
});

beforeAll(async () => {
  const mod = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = mod.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  http = request(await app.getUrl());

  // Estabelecimento interno da plataforma, com o PLATFORM_ADMIN
  ids.platform = (
    await prisma.restaurant.create({
      data: { slug: 'plat-interna', name: 'Plataforma', isPlatform: true },
    })
  ).id;
  await createUser(ids.platform, 'padmin', 'PLATFORM_ADMIN');
  // Cliente existente com ADMIN e atendente; e um PLATFORM_ADMIN gravado por engano nele
  ids.client = (
    await prisma.restaurant.create({
      data: { slug: 'cliente-existente', name: 'Cliente' },
    })
  ).id;
  ids.clientAdmin = await createUser(ids.client, 'cadmin', 'ADMIN');
  await createUser(ids.client, 'catt', 'ATTENDANT');
  await createUser(ids.client, 'fakeplat', 'PLATFORM_ADMIN');

  cookies.padmin = cookieOf(await login('padmin@plat.test', 'plat-interna'));
  cookies.cadmin = cookieOf(
    await login('cadmin@plat.test', 'cliente-existente'),
  );
  cookies.catt = cookieOf(await login('catt@plat.test', 'cliente-existente'));
  cookies.fakeplat = cookieOf(
    await login('fakeplat@plat.test', 'cliente-existente'),
  );
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('plataforma: acesso', () => {
  it('sem sessão → 401', async () => {
    expect((await http.get('/api/platform/establishments')).status).toBe(401);
  });

  it('ADMIN e ATTENDANT de cliente → 403 em listar, ver, criar, editar e alterar status', async () => {
    for (const k of ['cadmin', 'catt']) {
      expect(
        (await http.get('/api/platform/establishments').set(as(k))).status,
      ).toBe(403);
      expect(
        (
          await http
            .get(`/api/platform/establishments/${ids.client}`)
            .set(as(k))
        ).status,
      ).toBe(403);
      expect(
        (
          await http
            .post('/api/platform/establishments')
            .set(as(k))
            .send(establishment(`x-${k}`))
        ).status,
      ).toBe(403);
      expect(
        (
          await http
            .patch(`/api/platform/establishments/${ids.client}`)
            .set(as(k))
            .send({ name: 'X' })
        ).status,
      ).toBe(403);
      expect(
        (
          await http
            .patch(`/api/platform/establishments/${ids.client}/status`)
            .set(as(k))
            .send({ active: false })
        ).status,
      ).toBe(403);
    }
    expect(
      await prisma.restaurant.count({ where: { slug: { startsWith: 'x-' } } }),
    ).toBe(0);
  });

  it('PLATFORM_ADMIN fora do estabelecimento da plataforma → 403', async () => {
    expect(
      (await http.get('/api/platform/establishments').set(as('fakeplat')))
        .status,
    ).toBe(403);
  });

  it('PLATFORM_ADMIN não acessa a operação (pedidos, usuários, configurações) → 403', async () => {
    expect((await http.get('/api/orders').set(as('padmin'))).status).toBe(403);
    expect(
      (
        await http
          .post('/api/orders')
          .set(as('padmin'))
          .send({ channel: 'COUNTER', paymentMethod: 'PIX', items: [] })
      ).status,
    ).toBe(403);
    expect((await http.get('/api/users').set(as('padmin'))).status).toBe(403);
    expect(
      (
        await http
          .patch('/api/restaurants/settings')
          .set(as('padmin'))
          .send({ name: 'X' })
      ).status,
    ).toBe(403);
    expect(
      (await http.get('/api/reports/history').set(as('padmin'))).status,
    ).toBe(403);
  });

  it('ADMIN de cliente não cria nem promove ninguém a PLATFORM_ADMIN → 403', async () => {
    const res = await http.post('/api/users').set(as('cadmin')).send({
      name: 'Intruso',
      email: 'intruso@plat.test',
      password: 'SenhaForte123',
      role: 'PLATFORM_ADMIN',
    });
    expect(res.status).toBe(403);
    const att = await prisma.user.findFirstOrThrow({
      where: { email: 'catt@plat.test' },
    });
    expect(
      (
        await http
          .patch(`/api/users/${att.id}`)
          .set(as('cadmin'))
          .send({ role: 'PLATFORM_ADMIN' })
      ).status,
    ).toBe(403);
    expect(
      await prisma.user.count({
        where: { restaurantId: ids.client, role: 'PLATFORM_ADMIN' },
      }),
    ).toBe(1);
  });
});

describe('plataforma: listagem e detalhe', () => {
  it('lista clientes, nunca o estabelecimento interno, e não expõe senhas', async () => {
    const res = await http
      .get('/api/platform/establishments')
      .set(as('padmin'));
    expect(res.status).toBe(200);
    const list = res.body as Establishment[];
    expect(list.some((e) => e.id === ids.client)).toBe(true);
    expect(list.some((e) => e.id === ids.platform)).toBe(false);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('estabelecimento interno da plataforma → 404 em ver, editar e status', async () => {
    const url = `/api/platform/establishments/${ids.platform}`;
    expect((await http.get(url).set(as('padmin'))).status).toBe(404);
    expect(
      (await http.patch(url).set(as('padmin')).send({ name: 'Outro nome' }))
        .status,
    ).toBe(404);
    expect(
      (
        await http
          .patch(`${url}/status`)
          .set(as('padmin'))
          .send({ active: false })
      ).status,
    ).toBe(404);
  });
});

describe('plataforma: cadastro', () => {
  it('cria o estabelecimento e o primeiro ADMIN vinculado só a ele', async () => {
    const res = await http
      .post('/api/platform/establishments')
      .set(as('padmin'))
      .send(establishment('pizzaria-joao'));
    expect(res.status).toBe(201);
    const body = res.body as Establishment;
    expect(body).toMatchObject({
      slug: 'pizzaria-joao',
      active: true,
      document: VALID_CNPJ,
    });
    expect(body.users.map((u) => u.email)).toEqual([
      'admin@pizzaria-joao.test',
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/password|SenhaInicial/i);

    const r = await prisma.restaurant.findUniqueOrThrow({
      where: { slug: 'pizzaria-joao' },
    });
    expect(r).toMatchObject({
      isPlatform: false,
      cnpj: VALID_CNPJ,
      cpf: null,
      state: 'SP',
      zipCode: '01001000',
    });
    expect(r.address).toContain('São Paulo/SP');
    const users = await prisma.user.findMany({ where: { restaurantId: r.id } });
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      role: 'ADMIN',
      active: true,
      email: 'admin@pizzaria-joao.test',
    });
    expect(users[0].password).not.toBe('SenhaInicial123');
    ids.created = r.id;
  });

  it('CPF vai para o campo cpf (o cnpj das Configurações fica vazio)', async () => {
    const res = await http
      .post('/api/platform/establishments')
      .set(as('padmin'))
      .send(
        establishment('doces-da-ana', {
          document: '529.982.247-25',
          businessType: 'CONFECTIONERY',
        }),
      );
    expect(res.status).toBe(201);
    const r = await prisma.restaurant.findUniqueOrThrow({
      where: { slug: 'doces-da-ana' },
    });
    expect(r).toMatchObject({
      cpf: VALID_CPF,
      cnpj: null,
      businessType: 'CONFECTIONERY',
    });
  });

  it('corpo não escolhe tenant, papel nem marca de plataforma (400)', async () => {
    const post = (body: object) =>
      http.post('/api/platform/establishments').set(as('padmin')).send(body);
    expect(
      (await post(establishment('t-1', { restaurantId: ids.client }))).status,
    ).toBe(400);
    expect(
      (await post(establishment('t-2', { isPlatform: true }))).status,
    ).toBe(400);
    const withRole = establishment('t-3');
    expect(
      (
        await post({
          ...withRole,
          admin: { ...withRole.admin, role: 'PLATFORM_ADMIN' },
        })
      ).status,
    ).toBe(400);
    expect(
      await prisma.restaurant.count({
        where: { slug: { in: ['t-1', 't-2', 't-3'] } },
      }),
    ).toBe(0);
  });

  it.each([
    ['tipo de negócio inexistente', { businessType: 'BAR' }],
    ['documento inválido', { document: '12345678901' }],
    ['slug inválido', { slug: 'Pizzaria João' }],
    ['UF inválida', { state: 'XX' }],
    ['sem responsável', { ownerName: '' }],
    [
      'senha fraca do admin',
      { admin: { name: 'A', email: 'a@x.test', password: 'curta' } },
    ],
    ['sem admin inicial', { admin: undefined }],
  ])('validação: %s → 400 e nada gravado', async (_, extra) => {
    const before = await prisma.restaurant.count();
    const res = await http
      .post('/api/platform/establishments')
      .set(as('padmin'))
      .send(establishment('validacao', extra));
    expect(res.status).toBe(400);
    expect(await prisma.restaurant.count()).toBe(before);
  });

  it('slug repetido ou de demonstração → 409, sem criar usuário', async () => {
    const usersBefore = await prisma.user.count();
    for (const slug of ['pizzaria-joao', 'restaurante-demo']) {
      const res = await http
        .post('/api/platform/establishments')
        .set(as('padmin'))
        .send(
          establishment(slug, {
            admin: {
              name: 'Outro',
              email: 'outro@x.test',
              password: 'SenhaForte123',
            },
          }),
        );
      expect(res.status).toBe(409);
    }
    expect(await prisma.user.count()).toBe(usersBefore);
  });
});

describe('plataforma: novo ADMIN isolado no próprio estabelecimento', () => {
  it('entra pelo slug novo, vê só os próprios usuários e não alcança outros estabelecimentos', async () => {
    cookies.newAdmin = cookieOf(
      await login(
        'admin@pizzaria-joao.test',
        'pizzaria-joao',
        'SenhaInicial123',
      ),
    );
    // Credenciais do novo ADMIN não abrem outro estabelecimento
    expect(
      (
        await login(
          'admin@pizzaria-joao.test',
          'cliente-existente',
          'SenhaInicial123',
        )
      ).status,
    ).toBe(401);

    const users = await http.get('/api/users').set(as('newAdmin'));
    expect(users.status).toBe(200);
    expect(
      (users.body as Array<{ email: string }>).map((u) => u.email),
    ).toEqual(['admin@pizzaria-joao.test']);
    expect(
      (await http.get(`/api/users/${ids.clientAdmin}`).set(as('newAdmin')))
        .status,
    ).toBe(404);
    expect(
      (await http.get('/api/platform/establishments').set(as('newAdmin')))
        .status,
    ).toBe(403);

    // Cria usuário interno: fica no estabelecimento dele
    const res = await http.post('/api/users').set(as('newAdmin')).send({
      name: 'Caixa',
      email: 'caixa@pizzaria-joao.test',
      password: 'SenhaForte123',
      role: 'ATTENDANT',
    });
    expect(res.status).toBe(201);
    const created = await prisma.user.findFirstOrThrow({
      where: { email: 'caixa@pizzaria-joao.test' },
    });
    expect(created.restaurantId).toBe(ids.created);
  });
});

describe('plataforma: edição e status', () => {
  it('edita dados do cliente; slug não pode ser alterado', async () => {
    const url = `/api/platform/establishments/${ids.created}`;
    const res = await http
      .patch(url)
      .set(as('padmin'))
      .send({ name: 'Pizzaria do João II', city: 'Campinas' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Pizzaria do João II',
      city: 'Campinas',
      slug: 'pizzaria-joao',
    });
    const r = await prisma.restaurant.findUniqueOrThrow({
      where: { id: ids.created },
    });
    expect(r.address).toContain('Campinas/SP');

    expect(
      (await http.patch(url).set(as('padmin')).send({ slug: 'outro-slug' }))
        .status,
    ).toBe(400);
    expect(
      (await http.patch(url).set(as('padmin')).send({ whatsapp: null })).status,
    ).toBe(200);
    expect(
      (await http.patch(url).set(as('padmin')).send({ name: null })).status,
    ).toBe(400);
  });

  it('inativar encerra as sessões e bloqueia o login; reativar devolve o acesso', async () => {
    const url = `/api/platform/establishments/${ids.created}/status`;
    expect((await http.get('/api/auth/me').set(as('newAdmin'))).status).toBe(
      200,
    );

    const off = await http.patch(url).set(as('padmin')).send({ active: false });
    expect(off.status).toBe(200);
    expect((off.body as Establishment).active).toBe(false);
    expect((await http.get('/api/auth/me').set(as('newAdmin'))).status).toBe(
      401,
    );
    expect(
      (
        await login(
          'admin@pizzaria-joao.test',
          'pizzaria-joao',
          'SenhaInicial123',
        )
      ).status,
    ).toBe(401);
    // Outros estabelecimentos seguem normais
    expect((await http.get('/api/auth/me').set(as('cadmin'))).status).toBe(200);

    expect(
      (await http.patch(url).set(as('padmin')).send({ active: true })).status,
    ).toBe(200);
    expect(
      (
        await login(
          'admin@pizzaria-joao.test',
          'pizzaria-joao',
          'SenhaInicial123',
        )
      ).status,
    ).toBe(200);
  });
});
