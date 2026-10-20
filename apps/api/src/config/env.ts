import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');
const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6380'),
  MEILI_URL: optional,
  MEILI_KEY: optional,
  SMTP_URL: optional,
  MAIL_FROM: z.string().default('Book Club <hello@example.com>'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  DEV_LOGIN: bool,
  ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  WHATSAPP_TOKEN: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  AMAZON_ASSOCIATE_TAG: optional,
  RUN_WORKER_IN_API: bool,
  SESSION_TTL_DAYS: z.coerce.number().default(30),
  /** Where uploaded photos are written (relative to the API's working directory). */
  UPLOAD_DIR: z.string().default('uploads'),
  /** Public URL prefix for photos. The web app proxies /media to the API. */
  MEDIA_BASE_URL: z.string().default('/media'),
  /** Admin portal sign-in (separate from Google sign-in). Change both before deploying. */
  OPS_EMAIL: z.string().default('ops@bookclub.local'),
  OPS_PASSWORD: z.string().default('ChangeMe-ops-2026'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    cached = schema.parse(process.env);
    if (cached.NODE_ENV === 'production' && cached.DEV_LOGIN) {
      throw new Error('DEV_LOGIN must not be enabled in production');
    }
    if (cached.NODE_ENV === 'production' && cached.OPS_PASSWORD === 'ChangeMe-ops-2026') {
      throw new Error('Set OPS_PASSWORD (the admin portal password) before running in production');
    }
  }
  return cached;
}

export const isProd = () => env().NODE_ENV === 'production';
export const googleConfigured = () => Boolean(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET);
export const devLoginEnabled = () => env().DEV_LOGIN && !isProd();
