import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

/**
 * Configuração HTTP do app, compartilhada pelo main.ts e pelos testes HTTP (e2e),
 * para os testes exercitarem exatamente os mesmos pipes, prefixo e limites.
 */
export function configureApp(app: NestExpressApplication) {
  // Serve pasta uploads/ como arquivos estáticos via Express nativo
  // GET http://localhost:3001/uploads/products/arquivo.jpg
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Limite de body JSON (não afeta multipart — o multer cuida disso)
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '1mb' }));

  // CORS para desenvolvimento local
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
