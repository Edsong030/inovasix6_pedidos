import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Inovasix6 Pedidos API')
    .setDescription('API de gestão de pedidos para restaurantes')
    .setVersion('1.0')
    // Autenticação por cookie HttpOnly: rode POST /api/auth/login no próprio Swagger;
    // o navegador guarda o cookie inx_session e envia nas chamadas seguintes.
    .addCookieAuth('inx_session')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API rodando em http://localhost:${port}/api`);
  console.log(`📚 Docs em http://localhost:${port}/api/docs`);
}
bootstrap();
