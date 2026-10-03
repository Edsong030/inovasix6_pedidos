/**
 * Banco dos testes HTTP. Só aceita E2E_DATABASE_URL apontando para um banco cujo nome
 * termina em "_test": o setup APAGA e recria o schema, então nunca pode mirar o banco
 * de desenvolvimento nem o de produção.
 */
export function e2eDatabaseUrl(): string {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    throw new Error('Defina E2E_DATABASE_URL (banco descartável cujo nome termina em _test) para rodar os testes HTTP.');
  }
  const db = new URL(url).pathname.replace(/^\//, '');
  if (!db.endsWith('_test')) {
    throw new Error(`Recusado: o banco "${db}" não termina em _test. Os testes HTTP apagam o schema.`);
  }
  return url;
}
