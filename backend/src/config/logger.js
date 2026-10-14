import pino from 'pino';

export const createLogger = level => pino({ level, base: undefined });
