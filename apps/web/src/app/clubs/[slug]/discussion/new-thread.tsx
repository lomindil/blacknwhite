'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { call, errorMessage } from '@/lib/client-api';

export function NewThreadForm({ clubId, bookId, bookTitle, defaultGate, slug }: { clubId: string; bookId: string | null; bookTitle: string | null; defaultGate: number; slug: string }) {
  const router = useRouter();
  const [about, setAbout] = useState<'book' | 'general'>(bookId ? 'book' : 'general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [gate, setGate] = useState(String(defaultGate));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="card space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const t = await call<{ id: string }>(`/v1/clubs/${clubId}/threads`, {
            body: { title, body, bookId: about === 'book' ? bookId : null, chapterGate: about === 'book' ? Number(gate) || 0 : 0 },
          });
          router.push(`/clubs/${slug}/threads/${t.id}`);
        } catch (err) {
          setError(errorMessage(err));
          setBusy(false);
        }
      }}
    >
      <div className="h3">Start a conversation</div>
      {bookId && (
        <div className="flex gap-2 text-sm">
          {(['book', 'general'] as const).map((a) => (
            <button key={a} type="button" onClick={() => setAbout(a)} className={about === a ? 'btn btn-sm' : 'btn-ghost btn-sm'}>
              {a === 'book' ? `About ${bookTitle && bookTitle.length > 18 ? 'the book' : bookTitle}` : 'General'}
            </button>
          ))}
        </div>
      )}
      <div>
        <label className="label" htmlFor="t-title">Title</label>
        <input id="t-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={200} />
      </div>
      {about === 'book' && (
        <div>
          <label className="label" htmlFor="t-gate">Spoilers up to chapter</label>
          <input id="t-gate" type="number" min={0} className="input" value={gate} onChange={(e) => setGate(e.target.value)} />
          <p className="mt-1 text-xs text-muted">Only readers who've finished this chapter will see the thread. 0 = spoiler-free.</p>
        </div>
      )}
      <div>
        <label className="label" htmlFor="t-body">Message</label>
        <textarea id="t-body" rows={5} className="input" value={body} onChange={(e) => setBody(e.target.value)} required />
        <p className="mt-1 text-xs text-muted">Markdown works. Hide a sentence with ||double bars||.</p>
      </div>
      <FormError error={error} />
      <button className="btn w-full" disabled={busy}>Post</button>
    </form>
  );
}
