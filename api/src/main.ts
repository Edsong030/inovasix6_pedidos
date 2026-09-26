import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Inovasix6 Pedidos API')
    .setDescription('API de gestão de pedidos para restaurantes')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API rodando em http://localhost:${port}/api`);
  console.log(`📚 Docs em http://localhost:${port}/api/docs`);
}
bootstrap();
