import { HttpException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoginRateLimiter, LOGIN_WINDOW_MS, MAX_PER_ACCOUNT, MAX_PER_IP } from './login-rate-limiter';
import { SESSION_COOKIE, durationMs, readCookie, sessionCookieOptions } from './session';

// ─── Cookie e duração ─────────────────────────────────────────────────────────
describe('cookie de sessão', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('é HttpOnly, SameSite=Strict e restrito a /api', () => {
    process.env.NODE_ENV = 'development';
    expect(sessionCookieOptions(1000)).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/api', maxAge: 1000, secure: false });
  });
  it('é Secure em produção', () => {
    process.env.NODE_ENV = 'production';
    expect(sessionCookieOptions(1000).secure).toBe(true);
  });
  it('SameSite=None sem Secure cai para Lax (navegadores recusariam)', () => {
    process.env.NODE_ENV = 'development';
    process.env.COOKIE_SAMESITE = 'none';
    expect(sessionCookieOptions(1000).sameSite).toBe('lax');
  });
  it('lê o cookie certo do cabeçalho e ignora os demais', () => {
    const req = { headers: { cookie: `outro=1; ${SESSION_COOKIE}=abc.def.ghi; x=%zz` } };
    expect(readCookie(req, SESSION_COOKIE)).toBe('abc.def.ghi');
    expect(readCookie({ headers: {} }, SESSION_COOKIE)).toBeNull();
    expect(readCookie(req, 'x')).toBeNull(); // valor malformado não quebra
  });
  it('converte a duração configurada', () => {
    expect(durationMs('8h')).toBe(8 * 3_600_000);
    expect(durationMs('30m')).toBe(30 * 60_000);
    expect(durationMs('2d')).toBe(2 * 86_400_000);
    expect(durationMs('lixo')).toBe(8 * 3_600_000);
  });
});

// ─── Limite de tentativas ─────────────────────────────────────────────────────
describe('LoginRateLimiter', () => {
  const make = () => { const l = new LoginRateLimiter(); let t = 1_000_000; l.now = () => t; return { l, advance: (ms: number) => { t += ms; } }; };
  const status = (fn: () => void) => { try { fn(); return 200; } catch (e) { return (e as HttpException).getStatus(); } };

  it(`bloqueia com 429 após ${MAX_PER_ACCOUNT} falhas da mesma conta no mesmo IP`, () => {
    const { l } = make();
    for (let i = 0; i < MAX_PER_ACCOUNT; i++) { expect(status(() => l.assertAllowed('1.1.1.1', 'a@x', 'rest'))).toBe(200); l.recordFailure('1.1.1.1', 'a@x', 'rest'); }
    expect(status(() => l.assertAllowed('1.1.1.1', 'a@x', 'rest'))).toBe(429);
  });
  it('e-mail com maiúsculas/espaços conta como a mesma chave', () => {
    const { l } = make();
    for (let i = 0; i < MAX_PER_ACCOUNT; i++) l.recordFailure('1.1.1.1', ' A@X ', 'REST');
    expect(status(() => l.assertAllowed('1.1.1.1', 'a@x', 'rest'))).toBe(429);
  });
  it('outra conta no mesmo IP e a mesma conta em outro IP continuam liberadas', () => {
    const { l } = make();
    for (let i = 0; i < MAX_PER_ACCOUNT; i++) l.recordFailure('1.1.1.1', 'a@x', 'rest');
    expect(status(() => l.assertAllowed('1.1.1.1', 'b@x', 'rest'))).toBe(200);
    expect(status(() => l.assertAllowed('2.2.2.2', 'a@x', 'rest'))).toBe(200);
  });
  it(`teto por IP: ${MAX_PER_IP} falhas somando contas diferentes bloqueiam o IP`, () => {
    const { l } = make();
    for (let i = 0; i < MAX_PER_IP; i++) l.recordFailure('1.1.1.1', `u${i}@x`, 'rest');
    expect(status(() => l.assertAllowed('1.1.1.1', 'nova@x', 'rest'))).toBe(429);
  });
  it('libera depois da janela', () => {
    const { l, advance } = make();
    for (let i = 0; i < MAX_PER_ACCOUNT; i++) l.recordFailure('1.1.1.1', 'a@x', 'rest');
    advance(LOGIN_WINDOW_MS + 1);
    expect(status(() => l.assertAllowed('1.1.1.1', 'a@x', 'rest'))).toBe(200);
  });
  it('sucesso zera a contagem da conta', () => {
    const { l } = make();
    for (let i = 0; i < MAX_PER_ACCOUNT - 1; i++) l.recordFailure('1.1.1.1', 'a@x', 'rest');
    l.recordSuccess('1.1.1.1', 'a@x', 'rest');
    l.recordFailure('1.1.1.1', 'a@x', 'rest');
    expect(status(() => l.assertAllowed('1.1.1.1', 'a@x', 'rest'))).toBe(200);
  });
  it('a resposta 429 informa quando tentar de novo, sem revelar se a conta existe', () => {
    const { l } = make();
    for (let i = 0; i < MAX_PER_ACCOUNT; i++) l.recordFailure('1.1.1.1', 'a@x', 'rest');
    try { l.assertAllowed('1.1.1.1', 'a@x', 'rest'); } catch (e) {
      const body = (e as HttpException).getResponse() as Record<string, unknown>;
      expect(body.retryAfter).toBeGreaterThan(0);
      expect(String(body.message)).not.toMatch(/senha|usuário|existe/i);
    }
  });
});

// ─── JwtStrategy: sessão validada no banco ────────────────────────────────────
describe('JwtStrategy.validate', () => {
  const future = new Date(Date.now() + 3_600_000);
  const base = {
    userId: 'u1', restaurantId: 'r1', expiresAt: future, revokedAt: null as Date | null,
    user: {
      id: 'u1',
      email: 'u@x',
      role: UserRole.ATTENDANT as UserRole,
      active: true,
      restaurantId: 'r1',
      restaurant: { active: true },
    },
  };
  const strategy = (session: unknown) => {
    const prisma = { userSession: { findUnique: jest.fn(async () => session) } };
    const config = { getOrThrow: () => 'segredo-de-teste', get: () => 'development' };
    return new JwtStrategy(config as never, prisma as never);
  };
  const payload = { sub: 'u1', sid: 's1', rid: 'r1' };

  it('sessão válida: devolve papel e restaurante LIDOS DO BANCO', async () => {
    const s = { ...base, user: { ...base.user, role: UserRole.KITCHEN } };
    await expect(strategy(s).validate(payload)).resolves.toEqual({ id: 'u1', email: 'u@x', role: UserRole.KITCHEN, restaurantId: 'r1', sessionId: 's1' });
  });
  it.each([
    ['sessão inexistente', null],
    ['sessão revogada (logout, senha, papel)', { ...base, revokedAt: new Date() }],
    ['sessão expirada', { ...base, expiresAt: new Date(Date.now() - 1) }],
    ['usuário desativado', { ...base, user: { ...base.user, active: false } }],
    ['sessão de outro usuário', { ...base, userId: 'outro' }],
    ['token com restaurante trocado', { ...base, restaurantId: 'r2' }],
    ['usuário movido para outro restaurante', { ...base, user: { ...base.user, restaurantId: 'r2' } }],
    [
      'estabelecimento inativado pela plataforma',
      { ...base, user: { ...base.user, restaurant: { active: false } } },
    ],
  ])('%s → 401', async (_, session) => {
    await expect(strategy(session).validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('payload incompleto → 401 sem consultar o banco', async () => {
    const s = strategy(base);
    await expect(s.validate({ sub: 'u1' } as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
