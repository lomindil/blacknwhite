'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { call, errorMessage } from '@/lib/client-api';

export function StartConversation({ recipientId }: { recipientId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await call<{ conversationId: string }>('/v1/dms', { body: { recipientId, body } });
          router.push(`/messages/${res.conversationId}`);
        } catch (err) {
          setError(errorMessage(err));
          setBusy(false);
        }
      }}
    >
      <textarea className="input bg-surface shadow-card" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required placeholder="Say hello" aria-label="Message" />
      <p className="mt-1 text-xs text-muted">Links and images aren't allowed in a first message.</p>
      <FormError error={error} />
      <button className="btn mt-3" disabled={busy}>Send</button>
    </form>
  );
}
