'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { CityPicker } from '@/components/profile-fields';
import { call, errorMessage } from '@/lib/client-api';

interface Host {
  kind: 'club' | 'bookstore';
  id: string;
  name: string;
  city: string | null;
}

/** datetime-local values are in the browser's local time; we send ISO (UTC). */
const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined);

export function EventForm({ hosts, defaultHost }: { hosts: Host[]; defaultHost?: string }) {
  const router = useRouter();
  const [hostId, setHostId] = useState(defaultHost && hosts.some((h) => h.id === defaultHost) ? defaultHost : hosts[0].id);
  const host = hosts.find((h) => h.id === hostId)!;
  const [mode, setMode] = useState<'in_person' | 'online'>('in_person');
  const [city, setCity] = useState<string | null>(host.city);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => (f.get(k) as string)?.trim() || undefined;
        setBusy(true);
        setError(null);
        try {
          const ev = await call<{ id: string }>('/v1/events', {
            body: {
              ...(host.kind === 'club' ? { clubId: host.id } : { bookstoreId: host.id }),
              title: s('title'),
              description: s('description'),
              startsAt: toIso(s('startsAt') ?? ''),
              endsAt: toIso(s('endsAt') ?? ''),
              mode,
              ...(mode === 'online'
                ? { meetingUrl: s('meetingUrl') }
                : { venueName: s('venueName'), area: s('area'), address: s('address'), addressRsvpOnly: f.get('addressRsvpOnly') === 'on', city: city ?? undefined }),
              capacity: s('capacity') ? Number(s('capacity')) : undefined,
            },
          });
          router.push(`/events/${ev.id}`);
        } catch (err) {
          setError(errorMessage(err));
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="label" htmlFor="host">Hosted by</label>
        <select id="host" className="input" value={hostId} onChange={(e) => { setHostId(e.target.value); setCity(hosts.find((h) => h.id === e.target.value)?.city ?? null); }}>
          {hosts.map((h) => <option key={h.id} value={h.id}>{h.name}{h.kind === 'bookstore' ? ' (bookstore)' : ''}</option>)}
        </select>
      </div>
      <div><label className="label" htmlFor="title">Title</label><input id="title" name="title" className="input" required minLength={3} placeholder="e.g. Week 3 meetup: chapters 9–12" /></div>
      <div><label className="label" htmlFor="description">Details</label><textarea id="description" name="description" rows={3} className="input" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="startsAt">Starts</label><input id="startsAt" name="startsAt" type="datetime-local" className="input" required /></div>
        <div><label className="label" htmlFor="endsAt">Ends (optional)</label><input id="endsAt" name="endsAt" type="datetime-local" className="input" /></div>
      </div>
      <div className="flex gap-2">
        {(['in_person', 'online'] as const).map((m) => (
          <button key={m} type="button" className={mode === m ? 'btn btn-sm' : 'btn-ghost btn-sm'} onClick={() => setMode(m)}>
            {m === 'online' ? 'Online' : 'In person'}
          </button>
        ))}
      </div>
      {mode === 'online' ? (
        <div>
          <label className="label" htmlFor="meetingUrl">Meeting link</label>
          <input id="meetingUrl" name="meetingUrl" type="url" className="input" required placeholder="https://meet.google.com/…" />
          <p className="mt-1 text-xs text-muted">Only people who RSVP see the link.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="venueName">Venue</label><input id="venueName" name="venueName" className="input" required placeholder="Café or bookstore name" /></div>
            <div><label className="label" htmlFor="area">Neighbourhood</label><input id="area" name="area" className="input" placeholder="e.g. Indiranagar" /></div>
          </div>
          <div><label className="label" htmlFor="city">City</label><CityPicker value={city} onChange={setCity} /></div>
          <div>
            <label className="label" htmlFor="address">Exact address</label>
            <input id="address" name="address" className="input" />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="addressRsvpOnly" defaultChecked /> Show the exact address only to people who RSVP
            </label>
          </div>
        </>
      )}
      <div className="sm:w-48"><label className="label" htmlFor="capacity">Capacity (optional)</label><input id="capacity" name="capacity" type="number" min={1} className="input" /></div>
      <FormError error={error} />
      <button className="btn px-8" disabled={busy}>Publish event</button>
    </form>
  );
}
