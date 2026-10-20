import type { BookListPage, ShelfItem } from '@bnw/shared';
import { GENRES, LANGUAGES } from '@bnw/shared';
import Link from 'next/link';
import { BookRow } from '@/components/book-row';
import { WantToRead } from '@/components/recommendations';
import { Empty, PageHeader } from '@/components/ui';
import { api, getMe } from '@/lib/server-api';

export const metadata = { title: 'Books' };

type Search = { q?: string; language?: string; genre?: string; page?: string };

export default async function BooksPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { q, language, genre, page } = await searchParams;
  const me = await getMe();
  const current = Math.max(1, Number(page) || 1);
  const params = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(language ? { language } : {}),
    ...(genre ? { genre } : {}),
    page: String(current),
  });
  const [list, shelf] = await Promise.all([
    api<BookListPage>(`/v1/books?${params}`).catch(() => ({ items: [], page: 1, hasMore: false })),
    me ? api<ShelfItem[]>('/v1/me/books').catch(() => []) : [],
  ]);
  const onShelf = new Map(shelf.map((s) => [s.book.id, s.status]));
  const pageLink = (p: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    return `/books?${next}`;
  };
  const filtered = Boolean(q || language || genre);

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title={q ? `Results for “${q}”` : genre ? genre : 'Books'}
        actions={me && <Link href="/books/new" className="btn-ghost">Add a missing book</Link>}
      >
        {q ? 'Matches from our catalog, plus Open Library when we have few of our own.' : 'The books our readers and clubs are reading, most-read first.'}
      </PageHeader>

      <form className="mb-8 grid gap-2 sm:grid-cols-[1fr_12rem_12rem_auto]" action="/books">
        <input name="q" defaultValue={q} className="input py-3 text-base" placeholder="Search by title, author or ISBN — e.g. Pather Panchali, प्रेमचंद" />
        <select name="genre" defaultValue={genre ?? ''} className="input" aria-label="Genre">
          <option value="">All genres</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select name="language" defaultValue={language ?? ''} className="input" aria-label="Language">
          <option value="">Any language</option>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>
        <button className="btn px-6">Search</button>
      </form>
      {filtered && (
        <div className="-mt-4 mb-6 text-sm">
          <Link href="/books" className="link">Clear filters</Link>
        </div>
      )}

      {list.items.length ? (
        <div className="space-y-4">
          {list.items.map((b) => (
            <BookRow key={b.id} book={b} action={me ? <WantToRead bookId={b.id} shelf={onShelf.get(b.id)} /> : undefined} />
          ))}
        </div>
      ) : (
        <Empty title={q ? `Nothing found for “${q}”` : 'No books match these filters'}>
          {me ? <><Link href="/books/new" className="link">Add it to the catalog</Link> — our team reviews new books quickly.</> : 'Try another spelling or the ISBN.'}
        </Empty>
      )}

      {(current > 1 || list.hasMore) && (
        <nav className="mt-8 flex items-center justify-between border-t border-line pt-6 text-sm" aria-label="Pages">
          {current > 1 ? <Link href={pageLink(current - 1)} className="btn-ghost btn-sm">← Previous</Link> : <span />}
          <span className="text-muted">Page {current}</span>
          {list.hasMore ? <Link href={pageLink(current + 1)} className="btn-ghost btn-sm">Next →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
