import type { ConfigService } from '@nestjs/config';

/**
 * Valores que já foram publicados no repositório (docker-compose antigo e .env.example).
 * Estão no histórico do Git: quem os conhece forja tokens. Nunca podem assinar JWT em produção.
 */
const PUBLISHED_SECRETS = new Set([
  'inovasix6-super-secret-key-change-in-production',
  'change-this-to-a-strong-random-secret',
]);
const MIN_PRODUCTION_LENGTH = 32;

/** JWT_SECRET validado: em produção, recusa segredo curto ou já publicado (a API não sobe). */
export function jwtSecret(config: ConfigService): string {
  const secret = config.getOrThrow<string>('JWT_SECRET');
  if (config.get<string>('NODE_ENV') === 'production') {
    if (PUBLISHED_SECRETS.has(secret)) {
      throw new Error('JWT_SECRET inseguro: este valor está publicado no repositório. Gere um novo segredo aleatório.');
    }
    if (secret.length < MIN_PRODUCTION_LENGTH) {
      throw new Error(`JWT_SECRET inseguro: use pelo menos ${MIN_PRODUCTION_LENGTH} caracteres aleatórios (recomendado: 64+).`);
    }
  }
  return secret;
}
