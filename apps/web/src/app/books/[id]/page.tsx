import type { BookDetail, BookStats, BuyLink } from '@bnw/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ReportButton } from '@/components/actions';
import { BookCover, ClubCard, Section } from '@/components/ui';
import { cityName, languageName, readersLabel } from '@/lib/format';
import { api, apiOrNotFound, getMe } from '@/lib/server-api';
import { ReadingControl } from './reading-control';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const book = await api<BookDetail>(`/v1/books/${id}`).catch(() => null);
  return book ? { title: `${book.title} by ${book.authors.join(', ')}`, description: book.description?.slice(0, 160) } : {};
}

export default async function BookPage({ params }: Props) {
  const { id } = await params;
  const me = await getMe();
  const book = await apiOrNotFound<BookDetail>(`/v1/books/${id}`);
  const [cityStats, allStats, links] = await Promise.all([
    me?.city ? api<BookStats>(`/v1/books/${id}/stats?city=${me.city}`) : null,
    api<BookStats>(`/v1/books/${id}/stats`),
    api<BuyLink[]>(`/v1/books/${id}/buy-links`),
  ]);
  const local = cityStats ? readersLabel(cityStats.readingCount, cityStats.fewReaders, me?.city) : null;
  const national = readersLabel(allStats.readingCount, allStats.fewReaders);

  return (
    <div>
      {book.status === 'pending' && (
        <p className="mb-6 border border-line bg-soft p-3 text-sm">This book is waiting for review. Only you can see it until it's approved.</p>
      )}
      <div className="grid gap-10 md:grid-cols-[10rem_1fr_18rem]">
        <BookCover book={book} size="lg" />
        <div>
          <h1 className="h1">{book.title}</h1>
          {book.subtitle && <div className="mt-1 font-serif text-xl text-muted">{book.subtitle}</div>}
          <div className="mt-3 text-lg">
            {book.authors.join(', ')}
            {book.authorsNative.length > 0 && <span className="text-muted"> · {book.authorsNative.join(', ')}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="chip">{languageName(book.language)}</span>
            {book.publishedYear && <span className="chip">{book.publishedYear}</span>}
            {book.chapterCount && <span className="chip">{book.chapterCount} chapters</span>}
            {book.pageCount && <span className="chip">{book.pageCount} pages</span>}
            {book.genres.map((g) => (
              <Link key={g} href={`/books?genre=${encodeURIComponent(g)}`} className="chip border-sage-200 bg-sage-50 text-sage-700 hover:border-sage-400">{g}</Link>
            ))}
          </div>
          {(local || national || allStats.clubsReadingCount > 0) && (
            <div className="mt-6 rounded-r-xl border-l-4 border-sage-300 bg-sage-50 py-3 pl-4 pr-4">
              {local && <div className="font-serif text-lg">{local}</div>}
              {national && <div className="text-sm text-muted">{national} across India</div>}
              {allStats.clubsReadingCount > 0 && (
                <div className="text-sm text-muted">{allStats.clubsReadingCount} club{allStats.clubsReadingCount > 1 ? 's' : ''} reading this</div>
              )}
            </div>
          )}
          {book.description && <p className="mt-6 max-w-2xl whitespace-pre-line leading-relaxed">{book.description}</p>}
          {book.editions.some((e) => e.isbn13 || e.isbn10) && (
            <div className="mt-4 text-xs text-muted">
              ISBN {book.editions.map((e) => e.isbn13 ?? e.isbn10).filter(Boolean).join(', ')}
            </div>
          )}
          <div className="mt-6">
            {me && <ReportButton targetType="book" targetId={book.id} label="Report a problem with this book" />}
          </div>
        </div>
        <aside className="space-y-6">
          {me ? (
            <ReadingControl bookId={book.id} chapterCount={book.chapterCount} status={book.myStatus} />
          ) : (
            <Link href={`/login?next=/books/${book.id}`} className="btn w-full">Sign in to track this book</Link>
          )}
          <div>
            <div className="eyebrow mb-2">Buy this book</div>
            <div className="flex flex-col gap-2">
              {links.map((l) => (
                <a key={l.retailer} href={l.url} target="_blank" rel="noopener sponsored nofollow" className="btn-ghost justify-between">
                  <span>{l.label}</span>
                  <span className="text-muted">{l.priceInr ? `₹${l.priceInr}` : '→'}</span>
                </a>
              ))}
            </div>
            {links.some((l) => l.affiliate) && (
              <p className="mt-2 text-xs text-muted">We may earn a small commission from purchases through these links, at no extra cost to you.</p>
            )}
          </div>
        </aside>
      </div>
      {allStats.clubs.length > 0 && (
        <div className="mt-14">
          <Section title="Clubs reading this now">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(cityStats?.clubs.length ? [...cityStats.clubs, ...allStats.clubs.filter((c) => !cityStats.clubs.some((x) => x.id === c.id))] : allStats.clubs).map((c) => (
                <ClubCard key={c.id} club={c} />
              ))}
            </div>
            {me?.city && !cityStats?.clubs.length && <p className="mt-3 text-sm text-muted">No club in {cityName(me.city)} is reading this yet.</p>}
          </Section>
        </div>
      )}
    </div>
  );
}
