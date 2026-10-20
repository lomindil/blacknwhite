'use client';

import type { BookSummary } from '@bnw/shared';
import { useEffect, useState } from 'react';
import { call } from '@/lib/client-api';
import { BookCover } from './ui';

/** Typeahead over the catalog (which also pulls from Open Library when results are thin). */
export function BookPicker({ onPick, placeholder = 'Search for a book…' }: { onPick: (b: BookSummary) => void; placeholder?: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await call<BookSummary[]>(`/v1/books/search?q=${encodeURIComponent(q.trim())}&limit=8`);
        setResults(found.filter((b, i) => found.findIndex((x) => x.id === b.id) === i));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Search books" />
      {(results.length > 0 || loading) && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto border border-line bg-paper shadow-sm">
          {loading && <li className="px-3 py-2 text-xs text-muted">Searching…</li>}
          {results.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-soft"
                onClick={() => {
                  onPick(b);
                  setQ('');
                  setResults([]);
                }}
              >
                <BookCover book={b} size="sm" />
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-serif">{b.title}</span>
                  <span className="block truncate text-xs text-muted">{b.authors.join(', ')}{b.publishedYear ? ` · ${b.publishedYear}` : ''}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
