'use client';

import type { BookDetail, BookSummary, ClubBookInfo, InviteInfo } from '@bnw/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { BookPicker } from '@/components/book-picker';
import { BookCover } from '@/components/ui';
import { call, errorMessage } from '@/lib/client-api';
import { formatDate } from '@/lib/format';

const today = () => new Date().toISOString().slice(0, 10);

export function SetBookForm({ clubId, preselected }: { clubId: string; preselected: BookDetail | null }) {
  const router = useRouter();
  const [book, setBook] = useState<BookSummary | null>(preselected);
  const [total, setTotal] = useState(preselected?.chapterCount ? String(preselected.chapterCount) : '');
  const [perWeek, setPerWeek] = useState('4');
  const [startsOn, setStartsOn] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const weeks = total && perWeek ? Math.ceil(Number(total) / Number(perWeek)) : 0;

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!book) return setError('Choose a book first');
        setBusy(true);
        setError(null);
        try {
          await call(`/v1/clubs/${clubId}/books`, {
            body: { bookId: book.id, startsOn, totalChapters: Number(total), chaptersPerWeek: Number(perWeek) },
          });
          setBook(null);
          router.refresh();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      {book ? (
        <div className="flex items-center gap-4 border border-line p-3">
          <BookCover book={book} size="sm" />
          <div className="flex-1">
            <div className="font-serif">{book.title}</div>
            <div className="text-xs text-muted">{book.authors.join(', ')}</div>
          </div>
          <button type="button" className="text-sm text-muted hover:underline" onClick={() => setBook(null)}>Change</button>
        </div>
      ) : (
        <BookPicker
          onPick={async (b) => {
            setBook(b);
            const detail = await call<BookDetail>(`/v1/books/${b.id}`).catch(() => null);
            if (detail?.chapterCount) setTotal(String(detail.chapterCount));
          }}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="total">Chapters in the book</label>
          <input id="total" type="number" min={1} className="input" value={total} onChange={(e) => setTotal(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="perweek">Chapters per week</label>
          <input id="perweek" type="number" min={1} className="input" value={perWeek} onChange={(e) => setPerWeek(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="start">Start date</label>
          <input id="start" type="date" className="input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} required />
        </div>
      </div>
      {weeks > 0 && (
        <p className="text-sm text-muted">
          {weeks} weeks. We'll create a spoiler-free intro thread, one thread per week (each unlocks when a reader finishes that week's
          chapters), and a "finished the book" thread. Members are notified.
        </p>
      )}
      <FormError error={error} />
      <button className="btn" disabled={busy || !book}>Set as current book</button>
    </form>
  );
}

export function ScheduleEditor({ clubId, clubBook }: { clubId: string; clubBook: ClubBookInfo }) {
  const router = useRouter();
  const [total, setTotal] = useState(String(clubBook.totalChapters ?? ''));
  const [perWeek, setPerWeek] = useState(String(clubBook.chaptersPerWeek ?? ''));
  const [startsOn, setStartsOn] = useState(clubBook.startsOn);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <ol className="mb-4 divide-y divide-line border-y border-line text-sm">
        {clubBook.weeks.map((w) => (
          <li key={w.week} className="flex justify-between py-1.5">
            <span>Week {w.week}: chapters {w.fromChapter}–{w.toChapter}</span>
            <span className="text-muted">{formatDate(w.startsOn)}</span>
          </li>
        ))}
      </ol>
      <form
        className="grid gap-3 sm:grid-cols-4 sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSaved(false);
          try {
            await call(`/v1/clubs/${clubId}/books/${clubBook.id}/schedule`, {
              method: 'PUT',
              body: { totalChapters: Number(total), chaptersPerWeek: Number(perWeek), startsOn },
            });
            setSaved(true);
            router.refresh();
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      >
        <div><label className="label" htmlFor="s-total">Chapters</label><input id="s-total" type="number" className="input" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
        <div><label className="label" htmlFor="s-pw">Per week</label><input id="s-pw" type="number" className="input" value={perWeek} onChange={(e) => setPerWeek(e.target.value)} /></div>
        <div><label className="label" htmlFor="s-start">Start</label><input id="s-start" type="date" className="input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></div>
        <button className="btn-ghost">Update schedule</button>
      </form>
      <FormError error={error} />
      {saved && <p className="mt-2 text-sm text-muted">Schedule updated. Weekly threads were adjusted.</p>}
    </div>
  );
}

export function Invites({ clubId, initial }: { clubId: string; initial: InviteInfo[] }) {
  const [invites, setInvites] = useState(initial);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const share = (url: string) => `https://wa.me/?text=${encodeURIComponent(`Join our book club: ${url}`)}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ['Create link', {}],
          ['Link that expires in 7 days', { expiresInDays: 7 }],
          ['Single-use link', { maxUses: 1 }],
        ].map(([label, body]) => (
          <button
            key={label as string}
            type="button"
            className="btn-ghost btn-sm"
            onClick={async () => {
              try {
                const inv = await call<InviteInfo>(`/v1/clubs/${clubId}/invites`, { body });
                setInvites([inv, ...invites]);
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            {label as string}
          </button>
        ))}
      </div>
      <FormError error={error} />
      {invites.length > 0 && (
        <ul className="divide-y divide-line border-y border-line text-sm">
          {invites.map((i) => (
            <li key={i.code} className="flex flex-wrap items-center gap-3 py-2">
              <code className="flex-1 truncate">{i.url}</code>
              <span className="text-xs text-muted">
                {i.uses} used{i.maxUses ? ` of ${i.maxUses}` : ''}
                {i.expiresAt && ` · expires ${formatDate(i.expiresAt)}`}
              </span>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(i.url);
                  setCopied(i.code);
                }}
              >
                {copied === i.code ? 'Copied' : 'Copy'}
              </button>
              <a className="btn-ghost btn-sm" href={share(i.url)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <button
                type="button"
                className="text-xs text-muted hover:underline"
                onClick={async () => {
                  await call(`/v1/clubs/${clubId}/invites/${i.code}`, { method: 'DELETE' });
                  setInvites(invites.filter((x) => x.code !== i.code));
                }}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
