import { env } from './config/load-env.js';
import { createDatabase } from './config/db.js';
import { createLogger } from './config/logger.js';
import { createHealthService } from './services/health-service.js';
import { createApp } from './app.js';

const logger = createLogger(env.logLevel);
const database = createDatabase(env.db);
const app = createApp({ config: env, health: createHealthService(database) });
const server = app.listen(env.port, '127.0.0.1', () => {
  logger.info({ port: env.port }, 'Local API started; database status available at /api/health/ready');
});
server.on('error', () => { logger.error('Cannot start API. Check PORT is available.'); process.exitCode = 1; });
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const timer = setTimeout(() => process.exit(1), 10000).unref();
  server.close(async () => {
    await database.close();
    clearTimeout(timer);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
