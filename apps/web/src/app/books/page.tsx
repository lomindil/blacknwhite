import type { BookSummary } from '@bnw/shared';
import { LANGUAGES } from '@bnw/shared';
import Link from 'next/link';
import { BookCard, Empty, PageHeader } from '@/components/ui';
import { api, getMe } from '@/lib/server-api';

export const metadata = { title: 'Books' };

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ q?: string; language?: string }> }) {
  const { q, language } = await searchParams;
  const me = await getMe();
  const params = new URLSearchParams({ q: q ?? '', limit: '30', ...(language ? { language } : {}) });
  const results = q ? await api<BookSummary[]>(`/v1/books/search?${params}`).catch(() => []) : [];

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Find a book"
        actions={me && <Link href="/books/new" className="btn-ghost">Add a missing book</Link>}
      >
        Search by title, author (in English or native script) or ISBN.
      </PageHeader>
      <form className="mb-8 flex flex-col gap-2 sm:flex-row" action="/books">
        <input name="q" defaultValue={q} className="input flex-1 py-3 text-base" placeholder="e.g. Pather Panchali, प्रेमचंद, 9780143028574" autoFocus />
        <select name="language" defaultValue={language ?? ''} className="input sm:w-48">
          <option value="">Any language</option>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>
        <button className="btn px-6">Search</button>
      </form>
      {q && (
        results.length ? (
          <div className="grid gap-x-8 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
            {results.map((b) => (
              <BookCard key={b.id} book={b} note={b.publishedYear ? String(b.publishedYear) : undefined} />
            ))}
          </div>
        ) : (
          <Empty title={`Nothing found for “${q}”`}>
            {me ? <><Link href="/books/new" className="link">Add it to the catalog</Link> — our team reviews new books quickly.</> : 'Try another spelling or the ISBN.'}
          </Empty>
        )
      )}
    </div>
  );
}
