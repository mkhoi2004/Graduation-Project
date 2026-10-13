import { Controller, Get, Inject } from '@nestjs/common';
import { Database } from './db.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(Database) private readonly db: Database) {}
  @Get()
  status() { return { status: 'ok' }; }
  @Get('ready')
  async ready() {
    await this.db.request().query('SELECT 1');
    return { status: 'ready' };
  }
}
