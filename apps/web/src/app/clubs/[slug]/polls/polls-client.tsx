'use client';

import type { BookSummary, PollInfo } from '@bnw/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { FormError } from '@/components/actions';
import { BookCover } from '@/components/ui';
import { call, errorMessage } from '@/lib/client-api';
import { formatDateTime } from '@/lib/format';
import { BookPicker } from '@/components/book-picker';
import { IconPlus } from '@/components/icons';
import { Modal } from '@/components/modal';

/** The voting itself: tap an option to vote (or change your vote); results show once you've voted. */
export function PollBallot({ poll, onChange }: { poll: PollInfo; onChange: (p: PollInfo) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const showResults = poll.closed || Boolean(poll.myVote);
  return (
    <div>
      <ul className="space-y-2">
        {poll.options.map((o, i) => {
          const pct = poll.totalVotes ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
          const mine = poll.myVote === o.id;
          return (
            <li key={o.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <button
                type="button"
                disabled={poll.closed || busy}
                aria-pressed={mine}
                onClick={async () => {
                  setError(null);
                  setBusy(true);
                  try {
                    onChange(await call<PollInfo>(`/v1/polls/${poll.id}/votes`, { body: { optionId: o.id } }));
                  } catch (e) {
                    setError(errorMessage(e));
                  } finally {
                    setBusy(false);
                  }
                }}
                className={`relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-left text-sm transition ${
                  mine ? 'border-ochre-300 ring-2 ring-ochre-100' : 'border-line hover:border-ochre-300 hover:bg-ochre-50/40'
                } disabled:cursor-default`}
              >
                {showResults && <span className="absolute inset-y-0 left-0 bg-ochre-50 transition-all duration-700" style={{ width: `${pct}%` }} aria-hidden />}
                {o.book && <span className="relative"><BookCover book={o.book} size="sm" /></span>}
                <span className="relative flex-1">
                  <span className="font-medium">{o.label}</span>
                  {o.book && <span className="block text-xs text-muted">{o.book.authors[0]}</span>}
                </span>
                {mine && <span className="relative rounded-full bg-ochre-600 px-2 py-0.5 text-[10px] font-semibold text-white">Your vote</span>}
                {showResults && <span className="relative w-14 text-right text-xs tabular-nums text-muted">{pct}% · {o.votes}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">
        {poll.closed ? 'This poll is closed.' : showResults ? 'Tap another option to change your vote.' : 'Tap an option to vote. Results appear once you’ve voted.'}
      </p>
      <FormError error={error} />
    </div>
  );
}

/** "Vote" button that opens the ballot in a dialog over the current page. */
export function VotePollButton({ poll, className = 'btn btn-sm', label }: { poll: PollInfo; className?: string; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [p, setP] = useState(poll);
  useEffect(() => setP(poll), [poll]);
  const close = useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router]);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label ?? (p.closed ? 'See results' : p.myVote ? 'Change vote' : 'Vote now')}
      </button>
      <Modal open={open} onClose={close} title={p.question}>
        <div className="-mt-2 mb-5 text-sm text-muted">
          Asked by {p.createdBy.displayName} · {p.totalVotes} vote{p.totalVotes === 1 ? '' : 's'}
          {p.closesAt && !p.closed && ` · closes ${formatDateTime(p.closesAt)}`}
        </div>
        <PollBallot poll={p} onChange={setP} />
        <div className="mt-6 flex justify-end">
          <button type="button" className="btn" onClick={close}>
            {p.myVote ? 'Done' : 'Close'}
          </button>
        </div>
      </Modal>
    </>
  );
}

/** Summary card on the Polls page: results at a glance; voting happens in the dialog. */
export function PollCard({ poll, canClose, canSetBook, clubSlug }: { poll: PollInfo; canClose: boolean; canSetBook: boolean; clubSlug: string }) {
  const [p, setP] = useState(poll);
  useEffect(() => setP(poll), [poll]);
  const showResults = p.closed || Boolean(p.myVote);
  const top = Math.max(...p.options.map((o) => o.votes));
  const winner = p.closed && p.kind === 'book' ? p.options.find((o) => o.votes === top && o.votes > 0) : null;

  return (
    <div className={`card ${p.closed ? 'bg-paper' : ''}`}>
      <span className={`chip mb-2 ${p.closed ? '' : 'border-ochre-200 bg-ochre-50 text-ochre-700'}`}>{p.closed ? 'Closed' : p.closesAt ? `Closes ${formatDateTime(p.closesAt)}` : 'Open'}</span>
      <h2 className="h3 mb-1">{p.question}</h2>
      <div className="mb-4 text-xs text-muted">Asked by {p.createdBy.displayName} · {p.totalVotes} vote{p.totalVotes === 1 ? '' : 's'}{p.myVote ? ' · you voted' : ''}</div>
      <ul className="space-y-2.5">
        {p.options.map((o) => {
          const pct = p.totalVotes ? Math.round((o.votes / p.totalVotes) * 100) : 0;
          const isWinner = winner?.id === o.id;
          return (
            <li key={o.id} className="text-sm">
              <div className="mb-1 flex justify-between gap-3">
                <span className={`truncate ${isWinner ? 'font-semibold' : ''}`}>{o.label}{isWinner && <span className="ml-1.5 rounded-full bg-ochre-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Winner</span>}{p.myVote === o.id && <span className="ml-1.5 text-xs text-ochre-700">· your vote</span>}</span>
                {showResults && <span className="shrink-0 text-xs tabular-nums text-muted">{pct}%</span>}
              </div>
              {showResults && (
                <div className="h-1.5 overflow-hidden rounded-full bg-ochre-50">
                  <div className="h-full rounded-full bg-ochre-300 transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        {!p.closed && <VotePollButton poll={p} />}
        {!p.closed && canClose && (
          <button type="button" className="btn-ghost btn-sm" onClick={async () => setP(await call<PollInfo>(`/v1/polls/${p.id}/close`, { method: 'POST' }))}>
            Close poll
          </button>
        )}
        {winner?.book && canSetBook && (
          <Link href={`/clubs/${clubSlug}/settings?book=${winner.book.id}#book`} className="btn btn-sm">
            Make “{winner.book.title}” the next read
          </Link>
        )}
      </div>
    </div>
  );
}

/** Collapsed to a button until needed. */
export function NewPollPanel({ clubId }: { clubId: string }) {
  const [open, setOpen] = useState(false);
  if (open) return <NewPollForm clubId={clubId} onClose={() => setOpen(false)} />;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-ochre-300 bg-ochre-50/60 px-5 py-4 text-left transition hover:border-ochre-600 hover:bg-ochre-50"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ochre-600 text-white transition group-hover:scale-105"><IconPlus size={18} /></span>
      <span>
        <span className="block font-medium">New poll</span>
        <span className="block text-sm text-muted">Pick the next book, a meeting time, or anything else</span>
      </span>
    </button>
  );
}

export function NewPollForm({ clubId, onClose }: { clubId: string; onClose?: () => void }) {
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
      className="card animate-pop-in space-y-4"
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
          onClose?.();
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
      <div className="flex gap-2">
        <button className="btn" disabled={busy}>Create poll</button>
        {onClose && <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>}
      </div>
    </form>
  );
}
