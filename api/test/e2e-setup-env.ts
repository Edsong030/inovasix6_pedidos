import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { e2eDatabaseUrl } from './e2e-env';

// Antes de qualquer import do app: o .env local não sobrescreve variáveis já definidas,
// então as suítes HTTP usam sempre o banco de teste e um segredo JWT só desta execução.
process.env.DATABASE_URL = e2eDatabaseUrl();
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';
// Uploads em pasta temporária própria: os testes nunca escrevem em api/uploads
process.env.UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'inovasix-e2e-uploads-'));
// Integração Anota AI desligada por padrão; a suíte do webhook liga só no app dela
process.env.ANOTA_AI_ENABLED = 'false';
process.env.ANOTA_AI_WEBHOOK_SECRET = '';
