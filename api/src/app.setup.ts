import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'path';

/** Origens do web aceitas (CORS e CSRF). FRONTEND_URL aceita lista separada por vírgula. */
export function allowedOrigins(): string[] {
  return (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
/** Webhooks de integrações vêm de servidores externos (sem cookie; autenticação própria). */
const CSRF_EXEMPT = [/^\/api\/integrations\/[^/]+\/webhook\//];

/**
 * Proteção CSRF por verificação de origem (OWASP): em requisições que alteram dados,
 * se o navegador informar Origin, ela precisa ser o web configurado ou a própria API
 * (Swagger). Soma-se ao cookie SameSite=Strict. Clientes sem Origin (curl, integrações)
 * não são navegadores e não carregam cookie de outro site.
 */
export function originGuard(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method) || CSRF_EXEMPT.some((r) => r.test(req.path))) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const self = `${req.protocol}://${req.get('host')}`;
  if (origin === self || allowedOrigins().includes(origin)) return next();
  res.status(403).json({ statusCode: 403, message: 'Origem da requisição não permitida' });
}

/**
 * Configuração HTTP do app, compartilhada pelo main.ts e pelos testes HTTP (e2e),
 * para os testes exercitarem exatamente os mesmos pipes, prefixo e limites.
 */
export function configureApp(app: NestExpressApplication) {
  // Atrás de proxy reverso (TLS), o IP real do cliente vem de X-Forwarded-For.
  // Ex.: TRUST_PROXY=1 (um proxy à frente). Sem a variável, o cabeçalho é ignorado.
  if (process.env.TRUST_PROXY) {
    const v = process.env.TRUST_PROXY;
    app.set('trust proxy', /^\d+$/.test(v) ? Number(v) : v === 'true' ? true : v);
  }

  // Serve pasta uploads/ como arquivos estáticos via Express nativo
  // GET http://localhost:3001/uploads/products/arquivo.jpg
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Limite de body JSON (não afeta multipart — o multer cuida disso)
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '1mb' }));

  app.use(originGuard);

  // CORS: só o web configurado, com cookies (credentials)
  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
    // O frontend usa o Date da resposta para alinhar contagens (previsão de pronto) ao relógio do servidor
    exposedHeaders: ['Date'],
  });

  // Validação global dos DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Prefixo global da API
  app.setGlobalPrefix('api');
}
