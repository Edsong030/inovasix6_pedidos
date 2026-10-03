/**
 * Testes HTTP dos uploads: perfis, conteúdo real, limites e ausência de arquivo residual.
 * Grava só em UPLOADS_DIR (pasta temporária definida em e2e-setup-env.ts).
 */
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PASSWORD = 'SenhaDeTeste123';
const ROOT = process.env.UPLOADS_DIR!;
const prisma = new PrismaClient();
let app: NestExpressApplication;
let http: ReturnType<typeof request>;
const cookies: Record<string, string> = {};

const S = {
  png: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]),
  jpeg: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]),
  webp: Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(64, 3)]),
  mp4: Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.from([0, 0, 2, 0]), Buffer.from('isomiso2'), Buffer.alloc(64, 4)]),
  webm: Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]), Buffer.from([0x42, 0x82, 0x84]), Buffer.from('webm'), Buffer.alloc(64, 5)]),
  mov: Buffer.concat([Buffer.from([0, 0, 0, 0x14]), Buffer.from('ftypqt  '), Buffer.alloc(64, 6)]),
  html: Buffer.from('<html><body><script>alert(document.cookie)</script></body></html>'),
};

/** Todos os arquivos sob a pasta de uploads (caminho relativo). */
function files(dir = ROOT): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [relative(ROOT, p)];
  });
}
const upload = (path: string, who: string | null, buf: Buffer, filename: string, contentType: string) => {
  const r = http.post(`/api/uploads/${path}`);
  if (who) r.set('Cookie', cookies[who]);
  return r.attach('file', buf, { filename, contentType });
};

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = mod.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  http = request(await app.getUrl());

  const r = await prisma.restaurant.create({ data: { slug: 'uploads-e2e', name: 'Uploads E2E' } });
  const hash = await bcrypt.hash(PASSWORD, 4);
  for (const role of ['ADMIN', 'MANAGER', 'ATTENDANT', 'KITCHEN', 'DELIVERY'] as UserRole[]) {
    const email = `${role.toLowerCase()}@uploads.test`;
    await prisma.user.create({ data: { restaurantId: r.id, name: role, email, password: hash, role } });
    const res = await http.post('/api/auth/login').send({ email, password: PASSWORD, restaurantSlug: 'uploads-e2e' });
    cookies[role] = ([] as string[]).concat(res.headers['set-cookie']).find((c) => c.startsWith('inx_session='))!.split(';')[0];
  }
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('permissões', () => {
  it.each(['ATTENDANT', 'KITCHEN', 'DELIVERY'])('%s → 403 em imagem, vídeo e logo, sem arquivo gravado', async (role) => {
    const before = files();
    expect((await upload('products', role, S.png, 'a.png', 'image/png')).status).toBe(403);
    expect((await upload('products/videos', role, S.mp4, 'a.mp4', 'video/mp4')).status).toBe(403);
    expect((await upload('logos', role, S.png, 'a.png', 'image/png')).status).toBe(403);
    expect(files()).toEqual(before);
  });
  it('sem sessão → 401', async () => {
    expect((await upload('products', null, S.png, 'a.png', 'image/png')).status).toBe(401);
  });
});

describe('arquivos válidos', () => {
  it.each([
    ['ADMIN', 'products', S.png, 'foto.png', 'image/png', /^[0-9a-f]{32}\.png$/],
    ['MANAGER', 'products', S.jpeg, 'foto.jpeg', 'image/jpeg', /^[0-9a-f]{32}\.jpg$/],
    ['ADMIN', 'products', S.webp, 'foto.webp', 'image/webp', /^[0-9a-f]{32}\.webp$/],
    ['MANAGER', 'products/videos', S.mp4, 'clip.mp4', 'video/mp4', /^[0-9a-f]{32}\.mp4$/],
    ['ADMIN', 'products/videos', S.webm, 'clip.webm', 'video/webm', /^[0-9a-f]{32}\.webm$/],
    ['MANAGER', 'logos', S.png, 'logo.png', 'image/png', /^[0-9a-f]{32}\.png$/],
  ] as const)('%s envia %s (%s) → 201, nome aleatório, bytes idênticos', async (role, path, buf, name, type, pattern) => {
    const res = await upload(path, role, buf, name, type);
    expect(res.status).toBe(201);
    expect(res.body.filename).toMatch(pattern);
    const dir = path === 'logos' ? 'logos' : path === 'products' ? 'products' : join('products', 'videos');
    expect(readFileSync(join(ROOT, dir, res.body.filename)).equals(buf)).toBe(true);
  });

  it('nome enviado com caminho ("../../evil.png") é ignorado: salvo dentro da pasta com nome aleatório', async () => {
    const res = await upload('products', 'ADMIN', S.png, '../../../evil.png', 'image/png');
    expect(res.status).toBe(201);
    expect(res.body.filename).toMatch(/^[0-9a-f]{32}\.png$/);
    expect(files().some((f) => f.includes('evil'))).toBe(false);
    expect(existsSync(join(ROOT, '..', 'evil.png'))).toBe(false);
  });

  it('arquivo salvo é servido em /uploads com o tipo do conteúdo', async () => {
    const res = await upload('products', 'ADMIN', S.png, 'x.png', 'image/png');
    const got = await http.get(`/uploads/products/${res.body.filename}`);
    expect(got.status).toBe(200);
    expect(got.headers['content-type']).toMatch(/^image\/png/);
  });
});

describe('URL devolvida (persistida no cadastro)', () => {
  afterEach(() => { delete process.env.PUBLIC_API_URL; });

  it('sem PUBLIC_API_URL: relativa, e Host/X-Forwarded-* forjados não entram na URL', async () => {
    delete process.env.PUBLIC_API_URL;
    const res = await http.post('/api/uploads/products').set('Cookie', cookies.ADMIN)
      .set('Host', 'site-malicioso.example').set('X-Forwarded-Host', 'site-malicioso.example').set('X-Forwarded-Proto', 'http')
      .attach('file', S.png, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.url).toBe(`/uploads/products/${res.body.filename}`);
    expect(JSON.stringify(res.body)).not.toContain('malicioso');
  });

  it('com PUBLIC_API_URL: absoluta na origem configurada, mesmo com Host forjado', async () => {
    process.env.PUBLIC_API_URL = 'https://api.exemplo.com/api';
    const res = await http.post('/api/uploads/products/videos').set('Cookie', cookies.MANAGER).set('Host', 'site-malicioso.example')
      .attach('file', S.webm, { filename: 'c.webm', contentType: 'video/webm' });
    expect(res.status).toBe(201);
    expect(res.body.url).toBe(`https://api.exemplo.com/uploads/products/videos/${res.body.filename}`);
  });

  it('logo: a URL relativa devolvida pode ser salva nas configurações; caminhos arbitrários não', async () => {
    const up = await upload('logos', 'ADMIN', S.png, 'logo.png', 'image/png');
    expect(up.body.url).toMatch(/^\/uploads\/logos\/[0-9a-f]{32}\.png$/);
    const ok = await http.patch('/api/restaurants/settings').set('Cookie', cookies.ADMIN).send({ logoUrl: up.body.url });
    expect(ok.status).toBe(200);
    expect(ok.body.logoUrl).toBe(up.body.url);
    for (const logoUrl of ['/uploads/logos/../../etc/passwd', '/uploads/products/x.png', '/qualquer/x.png', 'javascript:alert(1)']) {
      expect((await http.patch('/api/restaurants/settings').set('Cookie', cookies.ADMIN).send({ logoUrl })).status).toBe(400);
    }
  });
});

describe('conteúdo incompatível, limites e nenhum arquivo residual', () => {
  let before: string[];
  beforeAll(() => { before = files(); });

  it.each([
    ['extensão falsa: HTML com .png', 'products', S.html, 'evil.png', 'image/png'],
    ['extensão falsa: QuickTime com .mp4', 'products/videos', S.mov, 'filme.mp4', 'video/mp4'],
    ['extensão falsa: PNG com .jpg', 'products', S.png, 'foto.jpg', 'image/jpeg'],
    ['MIME falso: texto como image/jpeg', 'products', Buffer.from('apenas texto'), 'foto.jpg', 'image/jpeg'],
    ['MIME falso: PNG enviado como text/html', 'products', S.png, 'foto.png', 'text/html'],
    ['MIME falso: HTML como video/webm', 'products/videos', S.html, 'clip.webm', 'video/webm'],
    ['extensão fora da lista: .svg', 'products', Buffer.from('<svg/>'), 'x.svg', 'image/svg+xml'],
    ['extensão fora da lista: .html', 'logos', S.html, 'x.html', 'text/html'],
  ])('%s → 400', async (_, path, buf, name, type) => {
    expect((await upload(path, 'ADMIN', buf, name, type)).status).toBe(400);
  });

  it.each([
    ['imagem > 5 MB', 'products', Buffer.concat([S.png, Buffer.alloc(5 * 1024 * 1024)]), 'big.png', 'image/png'],
    ['vídeo > 15 MB', 'products/videos', Buffer.concat([S.mp4, Buffer.alloc(15 * 1024 * 1024)]), 'big.mp4', 'video/mp4'],
    ['logo > 2 MB', 'logos', Buffer.concat([S.png, Buffer.alloc(2 * 1024 * 1024)]), 'big.png', 'image/png'],
  ])('%s → 413', async (_, path, buf, name, type) => {
    expect((await upload(path, 'ADMIN', buf, name, type)).status).toBe(413);
  });

  it('nenhuma das recusas deixou arquivo no disco', () => {
    expect(files()).toEqual(before);
  });
});
