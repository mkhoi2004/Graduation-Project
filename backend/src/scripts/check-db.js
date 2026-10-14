import { env } from '../config/load-env.js';
import { createDatabase } from '../config/db.js';

const database = createDatabase(env.db);
try {
  await database.checkDatabase();
  console.log('SQL connection and foundation schema: READY');
} catch (error) {
  const known = ['DB_CREDENTIALS_MISSING', 'DB_SCHEMA_MISSING'];
  console.error(known.includes(error.code) ? error.message :
    'SQL is not ready. Check instance/TCP/IP/Browser, SQL Authentication, database/bootstrap.sql and credentials.');
  process.exitCode = 1;
} finally {
  await database.close();
}
