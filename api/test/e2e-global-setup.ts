import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { assertIsolatedTestDatabase } from './e2e-env';

/** Recria o schema do banco de teste a partir das migrations (as mesmas de produção). */
export default async function globalSetup() {
  // Guarda repetida aqui: mesmo chamando o Jest direto, nada é apagado sem banco _test confirmado
  const url = assertIsolatedTestDatabase();
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
