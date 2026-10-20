'use client';

import type { Me } from '@bnw/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ActionButton, FormError } from '@/components/actions';
import { CityPicker, GenrePicker, LanguagePicker } from '@/components/profile-fields';
import { call, errorMessage } from '@/lib/client-api';

function useSave() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await call(path, { method: 'PATCH', body });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return { save, error, saved, busy };
}

export function ProfileSettings({ me }: { me: Me }) {
  const [displayName, setDisplayName] = useState(me.displayName);
  const [bio, setBio] = useState(me.bio ?? '');
  const [city, setCity] = useState(me.city);
  const [languages, setLanguages] = useState(me.languages);
  const [genres, setGenres] = useState(me.genres);
  const { save, error, saved, busy } = useSave();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save('/v1/me', { displayName, bio: bio || null, city, languages, genres });
      }}
    >
      <div><label className="label" htmlFor="dn">Name</label><input id="dn" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={60} /></div>
      <div><label className="label" htmlFor="bio">Bio</label><textarea id="bio" rows={3} className="input" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="What do you love to read?" /></div>
      <div><label className="label" htmlFor="city">City</label><CityPicker value={city} onChange={setCity} /></div>
      <div><span className="label">Languages</span><LanguagePicker value={languages} onChange={setLanguages} /></div>
      <div><span className="label">Genres</span><GenrePicker value={genres} onChange={setGenres} /></div>
      <FormError error={error} />
      {saved && <p className="text-sm text-muted">Saved.</p>}
      <button className="btn" disabled={busy}>Save profile</button>
    </form>
  );
}

export function NotificationSettings({ me }: { me: Me }) {
  const [s, setS] = useState(me.settings);
  const { save, error, saved, busy } = useSave();
  const toggle = (k: 'notifyEmail' | 'emailDigest' | 'notifyWhatsapp', label: string, hint: string) => (
    <label className="flex items-start gap-3">
      <input type="checkbox" className="mt-1" checked={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />
      <span>
        <span className="block">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );

  return (
    <form
      className="space-y-5 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        save('/v1/me/settings', { ...s, whatsappNumber: s.whatsappNumber || null });
      }}
    >
      {toggle('notifyEmail', 'Email me event reminders and important updates', 'Reminders 24 hours and 2 hours before events you RSVP to.')}
      {toggle('emailDigest', 'Daily digest email', 'One email a day with replies and club activity, instead of an email per post.')}
      <div className="border border-line p-4">
        {toggle('notifyWhatsapp', 'WhatsApp reminders', 'Event reminders and weekly reading nudges on WhatsApp. You can turn this off any time.')}
        {s.notifyWhatsapp && (
          <div className="mt-3">
            <label className="label" htmlFor="wa">WhatsApp number</label>
            <input id="wa" className="input" value={s.whatsappNumber ?? ''} onChange={(e) => setS({ ...s, whatsappNumber: e.target.value })} placeholder="+91 98765 43210" />
            <p className="mt-1 text-xs text-muted">Stored only for reminders and deleted if you turn WhatsApp off and clear it.</p>
          </div>
        )}
      </div>
      <div>
        <label className="label" htmlFor="dm">Who can message you</label>
        <select id="dm" className="input" value={s.dmPolicy} onChange={(e) => setS({ ...s, dmPolicy: e.target.value as Me['settings']['dmPolicy'] })}>
          <option value="club_members">People who share a club with me</option>
          <option value="nobody">Nobody</option>
        </select>
      </div>
      <FormError error={error} />
      {saved && <p className="text-muted">Saved.</p>}
      <button className="btn" disabled={busy}>Save preferences</button>
    </form>
  );
}

export function AccountActions({ email, blocks }: { email: string; blocks: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-8 text-sm">
      <div>
        <div className="label">Signed in as</div>
        <div>{email} (Google)</div>
        <div className="mt-3">
          <ActionButton path="/auth/logout-all" className="btn-ghost btn-sm" redirectTo="/">Sign out of all devices</ActionButton>
        </div>
      </div>

      <div>
        <div className="label">Blocked readers</div>
        {blocks.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2">
                <span>{b.displayName}</span>
                <ActionButton path={`/v1/blocks/${b.id}`} method="DELETE" className="btn-ghost btn-sm">Unblock</ActionButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">You haven't blocked anyone.</p>
        )}
      </div>

      <div>
        <div className="label">Your data</div>
        <p className="mb-2 text-muted">Download your profile, shelves, posts, clubs and RSVPs as JSON.</p>
        <a href="/api/v1/me/export" className="btn-ghost btn-sm">Export my data</a>
      </div>

      <div className="border border-danger p-4">
        <div className="label text-danger">Delete account</div>
        <p className="mb-3 text-muted">
          Removes your profile, shelves, memberships and RSVPs. Your posts stay in club discussions but show as "Deleted user". Clubs you own
          pass to the next admin. This can't be undone.
        </p>
        <label className="label" htmlFor="confirm-del">Type DELETE to confirm</label>
        <input id="confirm-del" className="input mb-3 max-w-xs" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        <button
          type="button"
          className="btn-ghost btn-danger"
          disabled={confirmText !== 'DELETE'}
          onClick={async () => {
            try {
              await call('/v1/me', { method: 'DELETE' });
              router.push('/');
              router.refresh();
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          Delete my account
        </button>
        <FormError error={error} />
      </div>
    </div>
  );
}
