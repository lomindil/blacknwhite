'use client';

import type { RsvpStatus } from '@bnw/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { call, errorMessage } from '@/lib/client-api';

export function RsvpButtons({ eventId, status }: { eventId: string; status: RsvpStatus | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rsvp = async (s: 'going' | 'maybe' | 'no') => {
    setBusy(true);
    setError(null);
    try {
      const res = await call<{ status: RsvpStatus }>(`/v1/events/${eventId}/rsvp`, { body: { status: s } });
      setCurrent(res.status);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="eyebrow mb-3">Are you going?</div>
      {current === 'waitlist' && <p className="mb-3 text-sm">The event is full — you're on the waitlist. We'll tell you if a spot opens up.</p>}
      <div className="grid grid-cols-3 gap-2">
        {(['going', 'maybe', 'no'] as const).map((s) => (
          <button key={s} type="button" disabled={busy} onClick={() => rsvp(s)} className={current === s || (s === 'going' && current === 'waitlist') ? 'btn btn-sm' : 'btn-ghost btn-sm'}>
            {s === 'going' ? 'Going' : s === 'maybe' ? 'Maybe' : "Can't go"}
          </button>
        ))}
      </div>
      <FormError error={error} />
    </div>
  );
}
