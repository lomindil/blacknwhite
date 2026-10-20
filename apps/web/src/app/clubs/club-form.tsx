'use client';

import { LANGUAGES } from '@bnw/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { CityPicker } from '@/components/profile-fields';
import { call, errorMessage } from '@/lib/client-api';

interface Values {
  name: string;
  description: string;
  city: string | null;
  language: string;
  visibility: 'public' | 'private';
}

export function ClubForm({ initial, clubId }: { initial: Values; clubId?: string }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((x) => ({ ...x, [k]: val }));

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setSaved(false);
        try {
          const body = { ...v, description: v.description || undefined };
          if (clubId) {
            await call(`/v1/clubs/${clubId}`, { method: 'PATCH', body });
            setSaved(true);
            router.refresh();
          } else {
            const club = await call<{ slug: string }>('/v1/clubs', { body });
            router.push(`/clubs/${club.slug}/settings?created=1`);
          }
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="label" htmlFor="name">Club name</label>
        <input id="name" className="input" value={v.name} onChange={(e) => set('name', e.target.value)} required minLength={3} maxLength={80} placeholder="e.g. Indiranagar Sunday Readers" />
      </div>
      <div>
        <label className="label" htmlFor="description">What's your club about?</label>
        <textarea id="description" rows={4} className="input" value={v.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} placeholder="What you read, how often you meet, where — and who should join." />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="city">City</label>
          <CityPicker value={v.city} onChange={(c) => set('city', c)} />
        </div>
        <div>
          <label className="label" htmlFor="language">Main language</label>
          <select id="language" className="input" value={v.language} onChange={(e) => set('language', e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="label">Who can join?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            ['public', 'Public', 'Listed in search and city pages. Anyone can join.'],
            ['private', 'Private', 'Not listed. Members join with an invite link.'],
          ] as const).map(([val, title, desc]) => (
            <label key={val} className={`cursor-pointer rounded-xl border p-3 text-sm transition ${v.visibility === val ? 'border-sage-600 bg-sage-50' : 'border-line bg-surface hover:border-sage-300'}`}>
              <input type="radio" name="visibility" className="mr-2" checked={v.visibility === val} onChange={() => set('visibility', val)} />
              <span className="font-medium">{title}</span>
              <span className="mt-1 block text-muted">{desc}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormError error={error} />
      {saved && <p className="text-sm text-muted">Saved.</p>}
      <button className="btn px-8" disabled={busy}>{clubId ? 'Save changes' : 'Create club'}</button>
    </form>
  );
}
