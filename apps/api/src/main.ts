import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  configureApp(app);
  const config = app.get(ConfigService);
  await app.listen(config.getOrThrow<number>('API_PORT'));
}
await bootstrap();
