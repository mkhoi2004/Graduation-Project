import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import { configureOpenApi } from './openapi.js';
import { getReportRootDir } from './reports/reports.service.js';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const frontendUrl = config.getOrThrow<string>('FRONTEND_URL');

  // Serve static Report documents at /reports/...
  const reportDir = getReportRootDir();
  app.use('/reports', express.static(reportDir));

  // Increase payload limit for base64 PDF and Excel reports
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
