import type { ConfigService } from '@nestjs/config';
import { jwtSecret } from './jwt-secret';

/** Stub mínimo do ConfigService (get/getOrThrow sobre um objeto). */
const cfg = (env: Record<string, string>) => ({
  get: (k: string) => env[k],
  getOrThrow: (k: string) => { if (env[k] === undefined) throw new Error(`${k} ausente`); return env[k]; },
}) as unknown as ConfigService;
const strong = 'a'.repeat(20) + 'Z9x!'.repeat(10);

describe('jwtSecret', () => {
  it('produção: recusa o segredo que estava no docker-compose versionado', () => {
    expect(() => jwtSecret(cfg({ NODE_ENV: 'production', JWT_SECRET: 'inovasix6-super-secret-key-change-in-production' }))).toThrow(/publicado/);
  });
  it('produção: recusa o valor de exemplo e segredos curtos', () => {
    expect(() => jwtSecret(cfg({ NODE_ENV: 'production', JWT_SECRET: 'change-this-to-a-strong-random-secret' }))).toThrow(/publicado/);
    expect(() => jwtSecret(cfg({ NODE_ENV: 'production', JWT_SECRET: 'curto' }))).toThrow(/32 caracteres/);
  });
  it('produção: aceita segredo forte', () => {
    expect(jwtSecret(cfg({ NODE_ENV: 'production', JWT_SECRET: strong }))).toBe(strong);
  });
  it('desenvolvimento: não bloqueia (o ambiente local continua subindo)', () => {
    expect(jwtSecret(cfg({ NODE_ENV: 'development', JWT_SECRET: 'curto' }))).toBe('curto');
  });
  it('sem JWT_SECRET: erro', () => {
    expect(() => jwtSecret(cfg({ NODE_ENV: 'production' }))).toThrow();
  });
});
