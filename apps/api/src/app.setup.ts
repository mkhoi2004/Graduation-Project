import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configureOpenApi } from './openapi.js';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const frontendUrl = config.getOrThrow<string>('FRONTEND_URL');
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  configureOpenApi(app);
}
