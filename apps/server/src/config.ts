import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  PORT: process.env['PORT'],
  HOST: process.env['HOST'],
  NODE_ENV: process.env['NODE_ENV'],
  CORS_ORIGIN: process.env['CORS_ORIGIN'],
  LOG_LEVEL: process.env['LOG_LEVEL'],
});
