import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: [process.env.WEB_ADMIN_URL ?? 'http://localhost:5173', process.env.PWA_URL ?? 'http://localhost:5174'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const puerto = Number(process.env.PORT ?? 3000);
  await app.listen(puerto);
  console.log(`API APR escuchando en http://localhost:${puerto}/api/v1`);
}

void bootstrap();
