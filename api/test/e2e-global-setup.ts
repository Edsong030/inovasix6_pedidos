import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { e2eDatabaseUrl } from './e2e-env';

/** Recria o schema do banco de teste a partir das migrations (as mesmas de produção). */
export default async function globalSetup() {
  const url = e2eDatabaseUrl();
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
