import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { parseEnv } from './env.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
export const env = parseEnv(process.env);
