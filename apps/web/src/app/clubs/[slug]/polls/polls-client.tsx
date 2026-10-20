'use client';

import type { BookSummary, PollInfo } from '@bnw/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { BookCover } from '@/components/ui';
import { call, errorMessage } from '@/lib/client-api';
import { formatDateTime } from '@/lib/format';
import { BookPicker } from '@/components/book-picker';

export function PollCard({ poll, canClose, canSetBook, clubSlug }: { poll: PollInfo; canClose: boolean; canSetBook: boolean; clubSlug: string }) {
  const router = useRouter();
  const [p, setP] = useState(poll);
  const [error, setError] = useState<string | null>(null);
  const showResults = p.closed || Boolean(p.myVote);
  const top = Math.max(...p.options.map((o) => o.votes));
  const winner = p.closed && p.kind === 'book' ? p.options.find((o) => o.votes === top && o.votes > 0) : null;

  return (
    <div className="card">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h2 className="h3">{p.question}</h2>
        <span className="chip shrink-0">{p.closed ? 'Closed' : p.closesAt ? `Closes ${formatDateTime(p.closesAt)}` : 'Open'}</span>
      </div>
      <div className="mb-4 text-xs text-muted">Asked by {p.createdBy.displayName} · {p.totalVotes} vote{p.totalVotes === 1 ? '' : 's'}</div>
      <ul className="space-y-2">
        {p.options.map((o) => {
          const pct = p.totalVotes ? Math.round((o.votes / p.totalVotes) * 100) : 0;
          const mine = p.myVote === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={p.closed}
                onClick={async () => {
                  setError(null);
                  try {
                    setP(await call<PollInfo>(`/v1/polls/${p.id}/votes`, { body: { optionId: o.id } }));
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
                className={`relative flex w-full items-center gap-3 overflow-hidden border px-3 py-2 text-left text-sm transition ${mine ? 'border-ink' : 'border-line hover:border-ink'} disabled:cursor-default`}
              >
                {showResults && <span className="absolute inset-y-0 left-0 bg-soft" style={{ width: `${pct}%` }} aria-hidden />}
                {o.book && <span className="relative"><BookCover book={o.book} size="sm" /></span>}
                <span className="relative flex-1">
                  {mine && '✓ '}
                  {o.label}
                  {o.book && <span className="block text-xs text-muted">{o.book.authors[0]}</span>}
                </span>
                {showResults && <span className="relative text-xs text-muted">{pct}% · {o.votes}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {!showResults && <p className="mt-2 text-xs text-muted">Vote to see results. You can change your vote until the poll closes.</p>}
      <FormError error={error} />
      <div className="mt-4 flex flex-wrap gap-2">
        {!p.closed && canClose && (
          <button type="button" className="btn-ghost btn-sm" onClick={async () => setP(await call<PollInfo>(`/v1/polls/${p.id}/close`, { method: 'POST' }))}>
            Close poll
          </button>
        )}
        {winner?.book && canSetBook && (
          <Link href={`/clubs/${clubSlug}/settings?book=${winner.book.id}#book`} className="btn btn-sm" onClick={() => router.refresh()}>
            Make “{winner.book.title}” the next read
          </Link>
        )}
      </div>
    </div>
  );
}

export function NewPollForm({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<'book' | 'time' | 'general'>('book');
  const [question, setQuestion] = useState('What should we read next?');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [closesAt, setClosesAt] = useState('');
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
          await call(`/v1/clubs/${clubId}/polls`, {
            body: {
              question,
              kind,
              closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
              options: kind === 'book' ? books.map((b) => ({ label: b.title, bookId: b.id })) : options.filter((o) => o.trim()).map((label) => ({ label })),
            },
          });
          setBooks([]);
          setOptions(['', '']);
          router.refresh();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="h3">New poll</div>
      <div className="flex gap-2">
        {(['book', 'time', 'general'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={kind === k ? 'btn btn-sm' : 'btn-ghost btn-sm'}
            onClick={() => {
              setKind(k);
              setQuestion(k === 'book' ? 'What should we read next?' : k === 'time' ? 'When should we meet?' : '');
            }}
          >
            {k === 'book' ? 'Next book' : k === 'time' ? 'Meeting time' : 'Other'}
          </button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="q">Question</label>
        <input id="q" className="input" value={question} onChange={(e) => setQuestion(e.target.value)} required minLength={3} />
      </div>
      {kind === 'book' ? (
        <div>
          <span className="label">Books ({books.length} of 2–10)</span>
          <ul className="mb-2 space-y-1 text-sm">
            {books.map((b) => (
              <li key={b.id} className="flex justify-between border border-line px-2 py-1">
                <span className="truncate">{b.title}</span>
                <button type="button" className="text-muted" onClick={() => setBooks(books.filter((x) => x.id !== b.id))} aria-label={`Remove ${b.title}`}>×</button>
              </li>
            ))}
          </ul>
          {books.length < 10 && <BookPicker onPick={(b) => !books.some((x) => x.id === b.id) && setBooks([...books, b])} />}
        </div>
      ) : (
        <div className="space-y-2">
          <span className="label">Options</span>
          {options.map((o, i) => (
            <input
              key={i}
              className="input"
              value={o}
              placeholder={`Option ${i + 1}`}
              onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
          {options.length < 10 && (
            <button type="button" className="text-xs text-muted hover:underline" onClick={() => setOptions([...options, ''])}>+ Add option</button>
          )}
        </div>
      )}
      <div>
        <label className="label" htmlFor="closes">Closes (optional)</label>
        <input id="closes" type="datetime-local" className="input" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
      </div>
      <FormError error={error} />
      <button className="btn w-full" disabled={busy}>Create poll</button>
    </form>
  );
}
