'use client';

import type { BookRecommendation, ClubRecommendation } from '@bnw/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { call, errorMessage } from '@/lib/client-api';
import { cityName, languageName, plural } from '@/lib/format';
import { IconCheck, IconSparkle } from './icons';
import { BookCover } from './ui';

function Reasons({ reasons, max = 3 }: { reasons: string[]; max?: number }) {
  if (!reasons.length) return null;
  return (
    <ul className="space-y-1.5">
      {reasons.slice(0, max).map((r) => (
        <li key={r} className="flex gap-2 text-[13px] leading-snug text-ink/80">
          <IconSparkle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ochre-600" />
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
}

export function RecClubCard({ rec, compact = false }: { rec: ClubRecommendation; compact?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'busy' | 'joined'>('idle');
  const [error, setError] = useState<string | null>(null);
  const c = rec.club;
  const meta = [c.city ? cityName(c.city) : 'Online', languageName(c.language), plural(c.memberCount, 'member')];

  return (
    <div className="card card-hover flex flex-col gap-4">
      <div>
        <Link href={`/clubs/${c.slug}`} className="h3 hover:underline">{c.name}</Link>
        <div className="mt-1 text-xs text-muted">{meta.join(' · ')}</div>
        {!compact && c.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{c.description}</p>}
      </div>
      {c.currentBook && (
        <div className="flex items-center gap-3 rounded-xl bg-paper p-2.5">
          <BookCover book={c.currentBook} size="sm" />
          <div className="min-w-0 text-sm">
            <div className="eyebrow">Reading now</div>
            <div className="truncate font-serif">{c.currentBook.title}</div>
            {c.chaptersPerWeek && <div className="text-xs text-muted">{plural(c.chaptersPerWeek, 'chapter')} a week</div>}
          </div>
        </div>
      )}
      <Reasons reasons={rec.reasons} max={compact ? 2 : 3} />
      <div className="mt-auto flex items-center gap-3 border-t border-line/70 pt-4">
        {state === 'joined' ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-700">
            <IconCheck className="h-4 w-4" /> Joined
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-sm"
            disabled={state === 'busy'}
            onClick={async () => {
              setState('busy');
              setError(null);
              try {
                await call(`/v1/clubs/${c.id}/join`, { method: 'POST' });
                setState('joined');
                router.push(`/clubs/${c.slug}`);
              } catch (e) {
                setError(errorMessage(e));
                setState('idle');
              }
            }}
          >
            {state === 'busy' ? 'Joining…' : 'Join club'}
          </button>
        )}
        <Link href={`/clubs/${c.slug}`} className="text-sm text-muted hover:text-ink">Take a look</Link>
      </div>
      {error && <p role="alert" className="-mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

const SHELF_LABEL = { want: 'On your want-to-read list', reading: "You're reading this", read: "You've read this" } as const;

export function WantToRead({ bookId, shelf }: { bookId: string; shelf?: keyof typeof SHELF_LABEL }) {
  const [state, setState] = useState<'idle' | 'busy' | 'added'>('idle');
  if (shelf || state === 'added') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-700">
        <IconCheck className="h-3.5 w-3.5" /> {SHELF_LABEL[shelf ?? 'want']}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      disabled={state === 'busy'}
      onClick={async () => {
        setState('busy');
        try {
          await call(`/v1/me/books/${bookId}`, { method: 'PUT', body: { status: 'want' } });
          setState('added');
        } catch {
          setState('idle');
        }
      }}
    >
      + Want to read
    </button>
  );
}

export function RecBookCard({ rec, compact = false }: { rec: BookRecommendation; compact?: boolean }) {
  const b = rec.book;
  if (compact) {
    return (
      <div className="flex gap-3 rounded-xl px-2 py-3 transition hover:bg-surface">
        <Link href={`/books/${b.id}`} className="shrink-0">
          <BookCover book={b} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/books/${b.id}`} className="font-serif leading-snug hover:underline">{b.title}</Link>
          <div className="truncate text-xs text-muted">{b.authors.join(', ')}</div>
          {rec.reasons[0] && <div className="mt-1 text-xs text-ink/70">{rec.reasons[0]}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="card card-hover flex gap-4">
      <Link href={`/books/${b.id}`} className="shrink-0">
        <BookCover book={b} size="md" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <Link href={`/books/${b.id}`} className="h3 hover:underline">{b.title}</Link>
          <div className="text-sm text-muted">{b.authors.join(', ')}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {b.genres.slice(0, 2).map((g) => (
              <span key={g} className="chip">{g}</span>
            ))}
            {b.pageCount && <span className="chip">{b.pageCount} pages</span>}
          </div>
        </div>
        <Reasons reasons={rec.reasons} />
        <div className="mt-auto">
          <WantToRead bookId={b.id} />
        </div>
      </div>
    </div>
  );
}
