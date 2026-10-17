import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guarda do banco dos testes HTTP. O setup do E2E APAGA e recria o schema
 * (prisma migrate reset), então só roda quando TODAS as condições valem:
 *
 *   1. DATABASE_URL é PostgreSQL e o nome do banco termina em "_test";
 *   2. o banco não é um dos protegidos (inovasix_pedidos, o de desenvolvimento);
 *   3. não é o mesmo banco do api/.env (desenvolvimento local), mesmo que renomeado;
 *   4. E2E_CONFIRM_DB_RESET traz exatamente o nome desse banco (confirmação explícita).
 *
 * Só lê variáveis já definidas no processo: o api/.env nunca fornece a URL dos testes.
 * As mensagens citam apenas o nome do banco, nunca a URL (que pode conter senha).
 */
export const E2E_CONFIRM_VAR = 'E2E_CONFIRM_DB_RESET';
const PROTECTED_DATABASES = new Set(['inovasix_pedidos']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

type DbIdentity = { host: string; port: string; database: string };

function identity(url: string): DbIdentity | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:')
    return null;
  const host = parsed.hostname.toLowerCase();
  return {
    host: LOCAL_HOSTS.has(host) ? 'localhost' : host,
    port: parsed.port || '5432',
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
  };
}

/** DATABASE_URL do api/.env (banco de desenvolvimento local), se existir. */
export function devDatabaseUrl(
  envFile = join(__dirname, '..', '.env'),
): string | undefined {
  let content: string;
  try {
    content = readFileSync(envFile, 'utf8');
  } catch {
    return undefined;
  }
  const line = content
    .split(/\r?\n/)
    .find((l) => /^\s*DATABASE_URL\s*=/.test(l));
  return line
    ?.replace(/^\s*DATABASE_URL\s*=\s*/, '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2');
}

/** Valida o ambiente e devolve a URL do banco de teste; lança erro antes de qualquer escrita. */
export function assertIsolatedTestDatabase(
  env: NodeJS.ProcessEnv = process.env,
  devUrl: string | undefined = devDatabaseUrl(),
): string {
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'Recusado: defina DATABASE_URL no terminal apontando para um banco descartável cujo nome termina em _test.',
    );
  }
  const target = identity(url);
  if (!target || !target.database) {
    throw new Error(
      'Recusado: DATABASE_URL não é uma URL PostgreSQL válida com nome de banco.',
    );
  }
  if (PROTECTED_DATABASES.has(target.database)) {
    throw new Error(
      `Recusado: "${target.database}" é o banco de desenvolvimento. Os testes HTTP apagam o schema.`,
    );
  }
  if (!target.database.endsWith('_test')) {
    throw new Error(
      `Recusado: o banco "${target.database}" não termina em _test. Os testes HTTP apagam o schema.`,
    );
  }
  const dev = devUrl ? identity(devUrl) : null;
  if (
    dev &&
    dev.host === target.host &&
    dev.port === target.port &&
    dev.database === target.database
  ) {
    throw new Error(
      `Recusado: "${target.database}" é o mesmo banco do api/.env (desenvolvimento local).`,
    );
  }
  if (env[E2E_CONFIRM_VAR] !== target.database) {
    throw new Error(
      `Recusado: confirme o reset definindo ${E2E_CONFIRM_VAR}=${target.database} (o nome exato do banco de teste).`,
    );
  }
  return url;
}
