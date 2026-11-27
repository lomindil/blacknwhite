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
  /**
   * Which deployment this is. "production" means real users: Google sign-in only, no seeded or sample
   * data, and the API refuses to start with unsafe settings. "development" turns on the simple dev login.
   * (NODE_ENV is how the code runs — the Docker images always set it to production.)
   */
  APP_ENV: z.enum(['development', 'production']).default('development'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6380'),
  MEILI_URL: optional,
  MEILI_KEY: optional,
  SMTP_URL: optional,
  MAIL_FROM: z.string().default('RedReader <hello@redreader.in>'),
  /** Sender (and reply-to) for messages written in Red's voice, like the welcome email. */
  MAIL_FROM_RED: z.string().default('Red from RedReader <red@redreader.in>'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  /** Email-only dev sign-in. On by default in development; must not be set in production. */
  DEV_LOGIN: z
    .string()
    .optional()
    .transform((v) => (v ? v === 'true' || v === '1' : undefined)),
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

/** Parses and checks settings. Throws on combinations that are unsafe for a production deployment. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const e = schema.parse(source);
  const prod = e.APP_ENV === 'production';
  if ((prod || e.NODE_ENV === 'production') && e.DEV_LOGIN) {
    throw new Error('DEV_LOGIN must not be enabled in production');
  }
  if (prod && e.NODE_ENV !== 'production') {
    throw new Error('APP_ENV=production needs NODE_ENV=production (secure cookies and production builds)');
  }
  if ((prod || e.NODE_ENV === 'production') && e.OPS_PASSWORD === 'ChangeMe-ops-2026') {
    throw new Error('Set OPS_PASSWORD (the admin portal password) before running in production');
  }
  return e;
}

/** Settings a production deployment should have, but can start without (logged as warnings). */
export function productionWarnings(e: Env): string[] {
  if (e.APP_ENV !== 'production') return [];
  const out: string[] = [];
  if (!(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET)) out.push('Google sign-in is not configured — nobody can sign in until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.');
  if (!e.SMTP_URL) out.push('SMTP_URL is not set — emails are logged instead of sent.');
  if (e.WEB_ORIGIN.startsWith('http://')) out.push(`WEB_ORIGIN is ${e.WEB_ORIGIN}; production should use https.`);
  return out;
}

export function env(): Env {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}

export const isProd = () => env().NODE_ENV === 'production';
export const googleConfigured = () => Boolean(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET);
/** A real-user deployment. Seeding and sample data are refused. */
export const isProdDeployment = () => env().APP_ENV === 'production';
export const devLoginEnabled = () => env().APP_ENV === 'development' && !isProd() && (env().DEV_LOGIN ?? true);
