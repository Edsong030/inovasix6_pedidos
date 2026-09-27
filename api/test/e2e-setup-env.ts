import { randomBytes } from 'node:crypto';
import { e2eDatabaseUrl } from './e2e-env';

// Antes de qualquer import do app: o .env local não sobrescreve variáveis já definidas,
// então as suítes HTTP usam sempre o banco de teste e um segredo JWT só desta execução.
process.env.DATABASE_URL = e2eDatabaseUrl();
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';
