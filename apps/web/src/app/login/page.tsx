import { redirect } from 'next/navigation';
import { api, getMe } from '@/lib/server-api';
import { DevLoginForm } from './dev-login';

export const metadata = { title: 'Sign in' };

const ERRORS: Record<string, string> = {
  google_not_configured: 'Google sign-in is not set up on this server yet. Use the developer sign-in below.',
  oauth_denied: 'Sign-in was cancelled.',
  oauth_state: 'Your sign-in expired. Please try again.',
  oauth_email: 'Your Google account email is not verified.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const me = await getMe();
  if (me) redirect(me.onboarded ? (next?.startsWith('/') ? next : '/home') : '/onboarding');
  const config = await api<{ google: boolean; devLogin: boolean }>('/auth/config').catch(() => ({ google: false, devLogin: false }));

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="h1 mb-2">Sign in</h1>
      <p className="mb-8 text-muted">One tap with Google. We only get your name, email and photo.</p>
      {error && (
        <p role="alert" className="mb-6 border border-danger p-3 text-sm text-danger">
          {ERRORS[error] ?? 'Sign-in failed. Please try again.'}
        </p>
      )}
      <a href="/auth/google" className={`btn w-full py-3 text-base ${config.google ? '' : 'pointer-events-none opacity-40'}`} aria-disabled={!config.google}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="currentColor" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" />
        </svg>
        Continue with Google
      </a>
      {!config.google && <p className="mt-2 text-xs text-muted">Google sign-in needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the API.</p>}
      {config.devLogin && <DevLoginForm next={next} />}
      <p className="mt-8 text-xs text-muted">
        By continuing you agree to our <a href="/terms" className="link">terms</a> and <a href="/privacy" className="link">privacy policy</a>.
      </p>
    </div>
  );
}
