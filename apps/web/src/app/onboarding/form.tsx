'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { CityPicker } from '@/components/profile-fields';
import { call, errorMessage } from '@/lib/client-api';

/** Name, city and consent. Reading tastes (genres, languages…) are asked in the quiz that follows. */
export function OnboardingForm(props: { displayName: string; city: string | null }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(props.displayName);
  const [city, setCity] = useState<string | null>(props.city);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-8"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!consent) return setError('Please accept the terms and privacy policy to continue.');
        setBusy(true);
        setError(null);
        try {
          await call('/v1/me', { method: 'PATCH', body: { displayName, city, acceptTerms: true } });
          router.push('/discover/quiz?welcome=1');
          router.refresh();
        } catch (err) {
          setError(errorMessage(err));
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} required />
      </div>
      <div>
        <label className="label" htmlFor="city">City</label>
        <CityPicker value={city} onChange={setCity} />
      </div>
      <label className="flex items-start gap-3 border border-line p-4 text-sm">
        <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I agree to the <Link href="/terms" className="link" target="_blank">terms of use</Link> and{' '}
          <Link href="/privacy" className="link" target="_blank">privacy policy</Link>. We store your name, email, photo, city and
          reading activity to run the service. You can export or delete your data any time in Settings.
        </span>
      </label>
      <FormError error={error} />
      <button className="btn px-8 py-3" disabled={busy}>Continue</button>
    </form>
  );
}
