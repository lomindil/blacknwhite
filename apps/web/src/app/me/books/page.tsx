import type { ShelfItem } from '@bnw/shared';
import Link from 'next/link';
import { BookCard, Empty, PageHeader } from '@/components/ui';
import { api, requireMe } from '@/lib/server-api';

export const metadata = { title: 'My shelves' };

const SHELVES = [
  { key: 'reading', label: 'Reading' },
  { key: 'want', label: 'Want to read' },
  { key: 'read', label: 'Finished' },
] as const;

export default async function ShelvesPage({ searchParams }: { searchParams: Promise<{ shelf?: string }> }) {
  await requireMe('/me/books');
  const { shelf } = await searchParams;
  const active = SHELVES.find((s) => s.key === shelf)?.key ?? 'reading';
  const all = await api<ShelfItem[]>('/v1/me/books');
  const items = all.filter((i) => i.status === active);

  return (
    <div>
      <PageHeader eyebrow="Library" title="My shelves" actions={<Link href="/me/import" className="btn-ghost">Import from Goodreads / StoryGraph</Link>} />
      <nav className="mb-6 flex gap-6 border-b border-line text-sm" aria-label="Shelves">
        {SHELVES.map((s) => (
          <Link
            key={s.key}
            href={`/me/books?shelf=${s.key}`}
            className={`-mb-px border-b-2 pb-2 ${active === s.key ? 'border-ink' : 'border-transparent text-muted hover:text-ink'}`}
            aria-current={active === s.key ? 'page' : undefined}
          >
            {s.label} <span className="text-muted">{all.filter((i) => i.status === s.key).length}</span>
          </Link>
        ))}
      </nav>
      {items.length ? (
        <div className="grid gap-x-8 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          {items.map((i) => (
            <BookCard
              key={i.book.id}
              book={i.book}
              note={
                i.status === 'reading'
                  ? `${i.progressPct}%${i.currentChapter ? ` · finished chapter ${i.currentChapter}` : ''}`
                  : i.status === 'read' && i.rating
                    ? '★'.repeat(i.rating)
                    : undefined
              }
            />
          ))}
        </div>
      ) : (
        <Empty title="This shelf is empty">
          <Link href="/books" className="link">Search for a book</Link> to add it.
        </Empty>
      )}
    </div>
  );
}
