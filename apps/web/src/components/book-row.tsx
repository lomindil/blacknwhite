import type { BookSummary } from '@bnw/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { languageName, plural } from '@/lib/format';
import { IconSparkle } from './icons';
import { BookCover } from './ui';

export type BookRowBook = BookSummary & {
  description?: string | null;
  genres?: string[];
  pageCount?: number | null;
  readingCount?: number | null;
  clubsReading?: number;
};

/** A full-width book row: cover, details, a short description, why it's here, and an action. */
export function BookRow({ book, reasons, action }: { book: BookRowBook; reasons?: string[]; action?: ReactNode }) {
  const facts = [book.publishedYear, languageName(book.language), book.pageCount ? `${book.pageCount} pages` : null].filter(Boolean);
  const social = [
    book.readingCount ? `${book.readingCount} readers` : null,
    book.clubsReading ? `${plural(book.clubsReading, 'club')} reading now` : null,
  ].filter(Boolean);
  return (
    <article className="card card-hover flex gap-5 sm:gap-6">
      <Link href={`/books/${book.id}`} className="shrink-0">
        <BookCover book={book} size="md" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:gap-8">
        <div className="min-w-0 flex-1">
          <Link href={`/books/${book.id}`} className="h3 hover:underline">{book.title}</Link>
          <div className="text-sm text-muted">{book.authors.join(', ')}</div>
          <div className="mt-1 text-xs text-muted">{facts.join(' · ')}</div>
          {book.description && <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-relaxed text-ink/80">{book.description}</p>}
          {book.genres && book.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {book.genres.slice(0, 4).map((g) => (
                <span key={g} className="chip">{g}</span>
              ))}
            </div>
          )}
        </div>
        {(reasons?.length || social.length > 0 || action) && (
          <div className="flex shrink-0 flex-col gap-3 md:w-64 md:border-l md:border-line/70 md:pl-6">
            {reasons && reasons.length > 0 && (
              <ul className="space-y-1.5">
                {reasons.slice(0, 3).map((r) => (
                  <li key={r} className="flex gap-2 text-[13px] leading-snug text-ink/80">
                    <IconSparkle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ochre-600" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
            {social.length > 0 && <div className="text-xs text-muted">{social.join(' · ')}</div>}
            {action && <div className="mt-auto">{action}</div>}
          </div>
        )}
      </div>
    </article>
  );
}
