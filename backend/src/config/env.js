import { z } from 'zod';

const boolean = z.enum(['true', 'false']).transform(value => value === 'true');
const port = z.coerce.number().int().min(1).max(65535);
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test']).default('development'),
  PORT: port.default(5000),
  CLIENT_ORIGIN: z.enum(['http://localhost:5173', 'http://127.0.0.1:5173']).default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['silent', 'error', 'warn', 'info', 'debug']).default('info'),
  DB_SERVER: z.string().min(1).default('DESKTOP-F5CFA0D'),
  DB_INSTANCE: z.string().min(1).default('SQLEXPRESS'),
  DB_PORT: z.preprocess(value => value === '' ? undefined : value, port.optional()),
  DB_NAME: z.literal('Graduation Project').default('Graduation Project'),
  DB_USER: z.string().default(''),
  DB_PASSWORD: z.string().default(''),
  DB_ENCRYPT: boolean.default(false),
  DB_TRUST_SERVER_CERTIFICATE: boolean.default(true),
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(5000),
  JWT_SECRET: z.string().default(''),
  JWT_EXPIRES_IN: z.string().default('1h'),
});

export function parseEnv(source) {
  const result = schema.safeParse(source);
  if (!result.success) {
    // List field names only; never include submitted values (they can be secrets).
    throw new Error(`Invalid environment fields: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
  }
  const value = result.data;
  return {
    nodeEnv: value.NODE_ENV, port: value.PORT, clientOrigin: value.CLIENT_ORIGIN,
    logLevel: value.LOG_LEVEL, jwtSecret: value.JWT_SECRET, jwtExpiresIn: value.JWT_EXPIRES_IN,
    db: {
      server: value.DB_SERVER, instance: value.DB_PORT ? undefined : value.DB_INSTANCE,
      port: value.DB_PORT, name: value.DB_NAME, user: value.DB_USER, password: value.DB_PASSWORD,
      encrypt: value.DB_ENCRYPT, trustServerCertificate: value.DB_TRUST_SERVER_CERTIFICATE,
      connectTimeout: value.DB_CONNECT_TIMEOUT_MS,
    },
  };
}
