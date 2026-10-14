import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const template = await readFile(new URL('../backend/.env.example', import.meta.url), 'utf8');
try {
  await writeFile(new URL('../backend/.env', import.meta.url),
    template.replace('replace-with-random-secret-at-least-32-characters', randomBytes(48).toString('hex')),
    { flag: 'wx', mode: 0o600 });
  console.log('Created backend/.env with a random JWT secret. Set DB_USER and DB_PASSWORD locally.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('backend/.env already exists; kept unchanged.');
}
