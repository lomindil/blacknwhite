'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { errorMessage } from '@/lib/client-api';

/** Developer sign-in: only rendered when the API has DEV_LOGIN=true (never in production). */
export function DevLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('meera@example.com');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-8 border border-dashed border-line p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await fetch('/auth/dev-login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const body = await res.json();
          if (!res.ok) throw Object.assign(new Error(body.message), body);
          router.push(body.onboarded ? (next?.startsWith('/') ? next : '/home') : '/onboarding');
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="eyebrow mb-3">Developer sign-in</div>
      <label className="label" htmlFor="dev-email">
        Email
      </label>
      <input id="dev-email" className="input mb-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button className="btn-ghost w-full" disabled={busy}>
        Sign in without Google
      </button>
      <p className="mt-2 text-xs text-muted">Seeded accounts: meera, arjun, fatima, karthik, ananya, rohan, divya, sahil, admin @example.com</p>
      <FormError error={error} />
    </form>
  );
}
