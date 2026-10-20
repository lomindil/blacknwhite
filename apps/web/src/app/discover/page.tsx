import type { Recommendations } from '@bnw/shared';
import Link from 'next/link';
import { IconSparkle } from '@/components/icons';
import { BookRow } from '@/components/book-row';
import { RecBookCard, RecClubCard, WantToRead } from '@/components/recommendations';
import { Empty, Section } from '@/components/ui';
import { plural } from '@/lib/format';
import { api, requireMe } from '@/lib/server-api';

export const metadata = { title: 'For you' };

/** What the picks are based on, in plain words. */
function basis(recs: Recommendations): string[] {
  const s = recs.signals;
  const out: string[] = [];
  if (recs.profile) out.push('your quiz answers');
  const shelved = s.booksRead + s.booksReading + s.booksWanted;
  if (shelved) out.push(plural(shelved, 'book') + ' on your shelves');
  if (s.rated) out.push(plural(s.rated, 'rating'));
  if (s.clubs) out.push(`what your ${s.clubs === 1 ? 'club has' : `${s.clubs} clubs have`} read`);
  return out;
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ fresh?: string }> }) {
  const me = await requireMe('/discover');
  const [recs, { fresh }] = await Promise.all([api<Recommendations>('/v1/me/recommendations'), searchParams]);
  const used = basis(recs);

  return (
    <div>
      <header className="mb-10 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div className="animate-fade-up">
          <div className="eyebrow mb-2">For you</div>
          <h1 className="h1">{fresh ? `Here's what we found, ${me.displayName.split(' ')[0]}` : 'Picked for you'}</h1>
          <p className="mt-3 max-w-2xl text-muted">
            {used.length
              ? `Based on ${used.length > 1 ? `${used.slice(0, -1).join(', ')} and ${used.at(-1)}` : used[0]}${recs.signals.topGenres.length ? ` — mostly ${recs.signals.topGenres.slice(0, 3).map((g) => g.toLowerCase()).join(', ')}` : ''}.`
              : "We don't know your taste yet, so these are popular picks. Answer a few questions and they'll get much better."}
          </p>
        </div>
        {recs.profile ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface px-5 py-4 text-sm">
            <IconSparkle className="h-5 w-5 shrink-0 text-ochre-600" />
            <span className="text-muted">Tastes change.</span>
            <Link href="/discover/quiz" className="link ml-auto shrink-0">Retake the quiz</Link>
          </div>
        ) : (
          <Link
            href="/discover/quiz"
            className="group flex items-center gap-4 rounded-2xl border border-sage-200 bg-sage-50 px-5 py-4 transition hover:border-sage-300 hover:shadow-lift"
          >
            <IconSparkle className="h-6 w-6 shrink-0 text-sage-700" />
            <span>
              <span className="block font-medium text-sage-800">Get matched in 2 minutes</span>
              <span className="block text-xs text-sage-700">A few questions about what you like to read</span>
            </span>
            <span className="ml-auto text-sage-700 transition group-hover:translate-x-1">→</span>
          </Link>
        )}
      </header>

      {recs.starters.length > 0 && (
        <Section title="Easy ways into reading">
          <p className="-mt-2 mb-5 text-sm text-muted">Short, well-loved books — good for starting (or restarting) the habit.</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recs.starters.map((r) => (
              <RecBookCard key={r.book.id} rec={r} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Clubs you might like" action={<Link href="/clubs" className="link text-sm">Browse all clubs</Link>}>
        {recs.clubs.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recs.clubs.map((r) => (
              <RecClubCard key={r.club.id} rec={r} />
            ))}
          </div>
        ) : (
          <Empty title="You're in every club we'd suggest">
            <Link href="/clubs/new" className="link">Start a new one</Link> and invite your friends.
          </Empty>
        )}
      </Section>

      <Section title={recs.starters.length ? 'More books for you' : 'Books for you'} action={<Link href="/books" className="link text-sm">Browse all books</Link>}>
        {recs.books.length ? (
          <div className="space-y-4">
            {recs.books.map((r) => (
              <BookRow key={r.book.id} book={r.book} reasons={r.reasons} action={<WantToRead bookId={r.book.id} />} />
            ))}
          </div>
        ) : (
          <Empty title="Nothing new to suggest yet">
            Add a few books you've read to <Link href="/me/books" className="link">your shelves</Link> and check back.
          </Empty>
        )}
      </Section>

      {!recs.signals.booksRead && !recs.signals.booksReading && (
        <div className="card mt-4 flex flex-wrap items-center gap-4 bg-paper">
          <div className="min-w-0 flex-1">
            <div className="h3">Already keep track on Goodreads?</div>
            <p className="text-sm text-muted">Import your shelves and we'll use what you've read and rated.</p>
          </div>
          <Link href="/me/import" className="btn-ghost">Import shelves</Link>
        </div>
      )}
    </div>
  );
}
