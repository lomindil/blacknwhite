'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { IconPlus } from '@/components/icons';
import { call, errorMessage } from '@/lib/client-api';

/** Collapsed to a single button until needed, so the thread list gets the full width. */
export function NewThreadForm({ clubId, bookId, bookTitle, defaultGate, slug }: { clubId: string; bookId: string | null; bookTitle: string | null; defaultGate: number; slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [about, setAbout] = useState<'book' | 'general'>(bookId ? 'book' : 'general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [gate, setGate] = useState(String(defaultGate));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-sage-300 bg-sage-50/60 px-5 py-4 text-left transition hover:border-sage-600 hover:bg-sage-50"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-700 text-white transition group-hover:scale-105"><IconPlus size={18} /></span>
        <span>
          <span className="block font-medium">Start a conversation</span>
          <span className="block text-sm text-muted">Ask a question, share a thought, or plan the next meetup</span>
        </span>
      </button>
    );
  }

  return (
    <form
      className="card animate-pop-in space-y-4"
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h3">Start a conversation</div>
        {bookId && (
          <div className="flex gap-2 text-sm">
            {(['book', 'general'] as const).map((a) => (
              <button key={a} type="button" onClick={() => setAbout(a)} className={about === a ? 'btn btn-sm' : 'btn-ghost btn-sm'}>
                {a === 'book' ? `About ${bookTitle}` : 'General'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_12rem]">
        <div>
          <label className="label" htmlFor="t-title">Title</label>
          <input id="t-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={200} autoFocus />
        </div>
        {about === 'book' && (
          <div>
            <label className="label" htmlFor="t-gate">Spoilers up to chapter</label>
            <input id="t-gate" type="number" min={0} className="input" value={gate} onChange={(e) => setGate(e.target.value)} />
          </div>
        )}
      </div>
      {about === 'book' && <p className="-mt-2 text-xs text-muted">Only readers who've finished this chapter will see the thread. 0 = spoiler-free.</p>}
      <div>
        <label className="label" htmlFor="t-body">Message</label>
        <textarea id="t-body" rows={5} className="input" value={body} onChange={(e) => setBody(e.target.value)} required />
        <p className="mt-1 text-xs text-muted">Markdown works. Hide a sentence with ||double bars||.</p>
      </div>
      <FormError error={error} />
      <div className="flex gap-2">
        <button className="btn" disabled={busy}>Post</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
