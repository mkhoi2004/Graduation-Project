import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './http.js';
import { Database } from './db.js';
import { seedLocalAccounts } from './bootstrap.js';

async function main() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: ['http://localhost:5173'], methods: ['GET', 'POST', 'PUT', 'DELETE'] });
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();
  if (process.env.SEED_LOCAL_ACCOUNTS === 'true') {
    const created = await seedLocalAccounts(app.get(Database));
    console.log(created ? 'Created local example accounts.' : 'Local accounts already exist; seed skipped.');
  }
  await app.listen(Number(process.env.PORT ?? 5089), '127.0.0.1');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
