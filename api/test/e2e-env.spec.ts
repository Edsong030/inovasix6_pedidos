import { execSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  E2E_CONFIRM_VAR,
  assertIsolatedTestDatabase,
  devDatabaseUrl,
} from './e2e-env';
import globalSetup from './e2e-global-setup';

// Mantém o spawnSync real (usado no teste do comando); só o execSync do setup é simulado
jest.mock('node:child_process', () => ({
  ...jest.requireActual<typeof import('node:child_process')>(
    'node:child_process',
  ),
  execSync: jest.fn(),
}));

/** Testes unitários da guarda do E2E: nenhum deles conecta a banco. */
const DEV_URL =
  'postgresql://dev:segredo-dev@localhost:5432/inovasix_pedidos?schema=public';
const TEST_URL =
  'postgresql://ci:segredo-ci@localhost:5432/inovasix_pedidos_test?schema=public';
const ok = {
  DATABASE_URL: TEST_URL,
  [E2E_CONFIRM_VAR]: 'inovasix_pedidos_test',
};

describe('assertIsolatedTestDatabase', () => {
  it('aceita banco _test com confirmação exata', () => {
    expect(assertIsolatedTestDatabase(ok, DEV_URL)).toBe(TEST_URL);
  });

  it('recusa sem DATABASE_URL', () => {
    expect(() =>
      assertIsolatedTestDatabase({ [E2E_CONFIRM_VAR]: 'x_test' }, DEV_URL),
    ).toThrow(/defina DATABASE_URL/);
  });

  it('recusa o banco de desenvolvimento inovasix_pedidos, mesmo com confirmação', () => {
    const env = {
      DATABASE_URL: DEV_URL,
      [E2E_CONFIRM_VAR]: 'inovasix_pedidos',
    };
    expect(() => assertIsolatedTestDatabase(env, undefined)).toThrow(
      /"inovasix_pedidos" é o banco de desenvolvimento/,
    );
  });

  it('recusa inovasix_pedidos em outro host/porta', () => {
    const env = {
      DATABASE_URL: 'postgres://u:p@db.interno:6543/inovasix_pedidos',
      [E2E_CONFIRM_VAR]: 'inovasix_pedidos',
    };
    expect(() => assertIsolatedTestDatabase(env, undefined)).toThrow(
      /banco de desenvolvimento/,
    );
  });

  it.each([
    'inovasix_pedidos_homolog',
    'producao',
    'test',
    'meu_test_db',
    'inovasix_pedidos_TEST',
  ])('recusa banco que não termina em _test: %s', (db) => {
    const env = {
      DATABASE_URL: `postgresql://u:p@localhost:5432/${db}`,
      [E2E_CONFIRM_VAR]: db,
    };
    expect(() => assertIsolatedTestDatabase(env, undefined)).toThrow(
      /não termina em _test/,
    );
  });

  it('recusa URL que não é PostgreSQL ou sem nome de banco', () => {
    for (const url of [
      'mysql://u:p@localhost/x_test',
      'não é url',
      'postgresql://u:p@localhost:5432/',
    ]) {
      expect(() =>
        assertIsolatedTestDatabase(
          { DATABASE_URL: url, [E2E_CONFIRM_VAR]: 'x_test' },
          undefined,
        ),
      ).toThrow(/URL PostgreSQL válida/);
    }
  });

  it('recusa o mesmo banco do api/.env, mesmo terminando em _test (localhost = 127.0.0.1)', () => {
    const dev = 'postgresql://dev:p@localhost:5432/meu_banco_test';
    const env = {
      DATABASE_URL: 'postgresql://outro:x@127.0.0.1/meu_banco_test',
      [E2E_CONFIRM_VAR]: 'meu_banco_test',
    };
    expect(() => assertIsolatedTestDatabase(env, dev)).toThrow(
      /mesmo banco do api\/\.env/,
    );
  });

  it('recusa sem a variável de confirmação ou com valor diferente do banco', () => {
    expect(() =>
      assertIsolatedTestDatabase({ DATABASE_URL: TEST_URL }, DEV_URL),
    ).toThrow(`${E2E_CONFIRM_VAR}=inovasix_pedidos_test`);
    for (const value of [
      'true',
      'yes',
      '1',
      'inovasix_pedidos',
      'outro_test',
    ]) {
      expect(() =>
        assertIsolatedTestDatabase(
          { DATABASE_URL: TEST_URL, [E2E_CONFIRM_VAR]: value },
          DEV_URL,
        ),
      ).toThrow(/confirme o reset/);
    }
  });

  it('mensagens nunca expõem usuário ou senha da URL', () => {
    const cases = [
      { DATABASE_URL: DEV_URL, [E2E_CONFIRM_VAR]: 'inovasix_pedidos' },
      { DATABASE_URL: TEST_URL },
      { DATABASE_URL: 'postgresql://dev:segredo-dev@localhost:5432/outro' },
    ];
    for (const env of cases) {
      try {
        assertIsolatedTestDatabase(env, DEV_URL);
        throw new Error('deveria recusar');
      } catch (err) {
        expect((err as Error).message).not.toMatch(/segredo|dev:|ci:/);
      }
    }
  });
});

describe('devDatabaseUrl', () => {
  it('lê DATABASE_URL do .env (com ou sem aspas) e tolera arquivo ausente', () => {
    const dir = mkdtempSync(join(tmpdir(), 'inovasix-env-'));
    writeFileSync(
      join(dir, '.env'),
      `PORT=3001\r\nDATABASE_URL="${DEV_URL}"\r\n`,
    );
    expect(devDatabaseUrl(join(dir, '.env'))).toBe(DEV_URL);
    writeFileSync(join(dir, 'b.env'), `DATABASE_URL=${DEV_URL}\n`);
    expect(devDatabaseUrl(join(dir, 'b.env'))).toBe(DEV_URL);
    expect(devDatabaseUrl(join(dir, 'nao-existe.env'))).toBeUndefined();
  });
});

describe('setup global do E2E', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    jest.mocked(execSync).mockClear();
  });

  it('recusa o banco de desenvolvimento sem chamar prisma migrate reset', async () => {
    process.env.DATABASE_URL = DEV_URL;
    process.env[E2E_CONFIRM_VAR] = 'inovasix_pedidos';
    await expect(globalSetup()).rejects.toThrow(/banco de desenvolvimento/);
    expect(execSync).not.toHaveBeenCalled();
  });

  it('com banco _test confirmado, roda o reset só contra a URL de teste', async () => {
    process.env.DATABASE_URL = TEST_URL;
    process.env[E2E_CONFIRM_VAR] = 'inovasix_pedidos_test';
    await globalSetup();
    expect(execSync).toHaveBeenCalledTimes(1);
    const [cmd, opts] = jest.mocked(execSync).mock.calls[0];
    expect(cmd).toContain('prisma migrate reset');
    expect(opts?.env?.DATABASE_URL).toBe(TEST_URL);
  });
});

describe('npm run test:e2e:isolated', () => {
  // Porta 9 (discard): se algo tentasse conectar, o erro seria de conexão, não a recusa da guarda
  const run = (env: Record<string, string>) => {
    const base = { ...process.env };
    delete base.DATABASE_URL;
    delete base[E2E_CONFIRM_VAR];
    return spawnSync(
      process.execPath,
      [
        '-r',
        'ts-node/register/transpile-only',
        join(__dirname, 'run-e2e-isolated.ts'),
      ],
      {
        cwd: join(__dirname, '..'),
        env: { ...base, ...env },
        encoding: 'utf8',
        timeout: 60_000,
      },
    );
  };

  it('falha antes de carregar o Jest quando DATABASE_URL aponta para inovasix_pedidos', () => {
    const r = run({
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:9/inovasix_pedidos',
      [E2E_CONFIRM_VAR]: 'inovasix_pedidos',
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(
      /Recusado: "inovasix_pedidos" é o banco de desenvolvimento/,
    );
    expect(r.stdout + r.stderr).not.toMatch(/prisma|PASS|FAIL|Test Suites/);
  }, 60_000);

  it('falha sem a confirmação, mesmo com banco _test', () => {
    const r = run({
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:9/qualquer_test',
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(new RegExp(`${E2E_CONFIRM_VAR}=qualquer_test`));
  }, 60_000);

  it('falha sem DATABASE_URL no terminal (não usa a do api/.env)', () => {
    const r = run({ [E2E_CONFIRM_VAR]: 'inovasix_pedidos' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/defina DATABASE_URL/);
  }, 60_000);
});
