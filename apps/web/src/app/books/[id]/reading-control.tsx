'use client';

import type { MyReadingStatus, ReadingStatusValue } from '@bnw/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { call, errorMessage } from '@/lib/client-api';

const LABELS: Record<ReadingStatusValue, string> = { want: 'Want to read', reading: "I'm reading this", read: 'Finished' };

/** "I'm reading this", progress by chapter or percent, and rating. */
export function ReadingControl({ bookId, chapterCount, status }: { bookId: string; chapterCount: number | null; status: MyReadingStatus | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [chapter, setChapter] = useState(String(status?.currentChapter ?? 0));
  const [pct, setPct] = useState(String(status?.progressPct ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await call<MyReadingStatus>(`/v1/me/books/${bookId}`, { method: 'PUT', body: { status: current?.status ?? 'reading', ...body } });
      setCurrent(next);
      setChapter(String(next.currentChapter));
      setPct(String(next.progressPct));
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="eyebrow mb-3">Your reading</div>
      <div className="grid grid-cols-1 gap-2">
        {(Object.keys(LABELS) as ReadingStatusValue[]).map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => save({ status: s })}
            className={current?.status === s ? 'btn' : 'btn-ghost'}
            aria-pressed={current?.status === s}
          >
            {current?.status === s && '✓ '}
            {LABELS[s]}
          </button>
        ))}
      </div>

      {current?.status === 'reading' && (
        <form
          className="mt-5 space-y-3 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            save({ status: 'reading', currentChapter: Number(chapter) || 0, ...(chapterCount ? {} : { progressPct: Number(pct) || 0 }) });
          }}
        >
          <div>
            <label className="label" htmlFor="chapter">Chapters finished{chapterCount ? ` (of ${chapterCount})` : ''}</label>
            <input id="chapter" type="number" min={0} max={chapterCount ?? 1000} className="input" value={chapter} onChange={(e) => setChapter(e.target.value)} />
            <p className="mt-1 text-xs text-muted">Club threads unlock as you mark chapters done.</p>
          </div>
          {!chapterCount && (
            <div>
              <label className="label" htmlFor="pct">Progress %</label>
              <input id="pct" type="number" min={0} max={100} className="input" value={pct} onChange={(e) => setPct(e.target.value)} />
            </div>
          )}
          <button className="btn-ghost w-full" disabled={busy}>Update progress</button>
        </form>
      )}

      {current?.status === 'read' && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="label">Your rating</div>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={current.rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => save({ status: 'read', rating: n })}
                className={`text-2xl ${current.rating && n <= current.rating ? 'text-ink' : 'text-line'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      )}

      {current && (
        <button
          type="button"
          className="mt-4 text-xs text-muted hover:underline"
          onClick={async () => {
            await call(`/v1/me/books/${bookId}`, { method: 'DELETE' });
            setCurrent(null);
            router.refresh();
          }}
        >
          Remove from my shelves
        </button>
      )}
      <FormError error={error} />
    </div>
  );
}
