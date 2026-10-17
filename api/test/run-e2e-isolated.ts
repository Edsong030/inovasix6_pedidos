/**
 * npm run test:e2e:isolated — valida o banco de teste ANTES de carregar o Jest.
 * Se a guarda recusar, sai com erro sem conectar ao banco nem rodar migrations.
 * Argumentos extras vão para o Jest (ex.: npm run test:e2e:isolated -- security).
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { assertIsolatedTestDatabase } from './e2e-env';

try {
  assertIsolatedTestDatabase();
} catch (err) {
  console.error(`⛔ ${(err as Error).message}`);
  process.exit(1);
}

const root = join(__dirname, '..');
const { status } = spawnSync(
  process.execPath,
  [
    '--experimental-vm-modules',
    join(root, 'node_modules', 'jest', 'bin', 'jest.js'),
    '--config',
    './test/jest-e2e.json',
    '--runInBand',
    ...process.argv.slice(2),
  ],
  { cwd: root, stdio: 'inherit' },
);
process.exit(status ?? 1);
