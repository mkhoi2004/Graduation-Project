import { z } from 'zod';

export const passwordSchema = z.string().min(9).max(72)
  .regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/)
  .refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password exceeds bcrypt byte limit');
