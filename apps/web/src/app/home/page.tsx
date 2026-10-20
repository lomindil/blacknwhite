import type { HomeFeed, Recommendations } from '@bnw/shared';
import Link from 'next/link';
import { IconSparkle } from '@/components/icons';
import { RecClubCard } from '@/components/recommendations';
import { BookCard, BookCover, ClubCard, Empty, EventCard, Section } from '@/components/ui';
import { cityName, readersLabel } from '@/lib/format';
import { api, requireMe } from '@/lib/server-api';

export const metadata = { title: 'Home' };

/** Signed-in home feed. The landing page at / stays available to everyone. */
export default async function HomePage() {
  const me = await requireMe('/home');
  const [feed, recs] = await Promise.all([api<HomeFeed>('/v1/me/home'), api<Recommendations>('/v1/me/recommendations')]);
  const firstName = me.displayName.split(' ')[0];
  // Nothing to show yet: no clubs, no books, no quiz. Lead with getting matched.
  const brandNew = !feed.clubs.length && !feed.reading.length && !recs.profile && !recs.signals.booksRead && !recs.signals.booksWanted;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div>
        {brandNew ? (
          <div className="relative mb-10 overflow-hidden rounded-3xl border border-sage-200 bg-sage-50 p-8 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-drift rounded-full bg-ochre-100/70 blur-2xl" aria-hidden />
            <div className="relative animate-fade-up">
              <div className="eyebrow mb-3">Welcome, {firstName}</div>
              <h1 className="h1 max-w-xl">Let&apos;s find your first book club.</h1>
              <p className="mt-3 max-w-xl text-ink/75">
                Tell us what you like to read — or what you&apos;d like to try — and we&apos;ll match you with clubs and books. It takes
                about two minutes, and it&apos;s fine if you haven&apos;t read much yet.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/discover/quiz" className="btn px-6 py-3">
                  <IconSparkle className="h-4 w-4" /> Get matched
                </Link>
                <Link href="/clubs" className="btn-ghost px-6 py-3">Browse clubs</Link>
                <Link href="/me/import" className="text-sm text-sage-800 underline decoration-sage-300 underline-offset-4">
                  Import from Goodreads
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="eyebrow mb-2">{me.city ? cityName(me.city) : 'Welcome back'}</div>
            <h1 className="h1">Hello, {firstName}.</h1>
          </div>
        )}

        {recs.clubs.length > 0 && !feed.clubs.length && (
          <Section title="Clubs picked for you" action={<Link href="/discover" className="link text-sm">See all picks</Link>}>
            <div className="grid gap-4 sm:grid-cols-2">
              {recs.clubs.slice(0, 4).map((r) => (
                <RecClubCard key={r.club.id} rec={r} compact />
              ))}
            </div>
          </Section>
        )}

        <Section title="Currently reading" action={<Link href="/me/books" className="link text-sm">All shelves</Link>}>
          {feed.reading.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {feed.reading.map((r) => (
                <Link key={r.book.id} href={`/books/${r.book.id}`} className="card card-hover flex gap-4">
                  <BookCover book={r.book} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-serif">{r.book.title}</div>
                    <div className="text-xs text-muted">{r.book.authors[0]}</div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sage-50">
                      <div className="h-1.5 rounded-full bg-sage-600 transition-all duration-700" style={{ width: `${r.progressPct}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {r.currentChapter ? `Finished chapter ${r.currentChapter} · ` : ''}
                      {r.progressPct}%
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="Nothing on the go">
              <Link href="/books" className="link">Find a book</Link> or{' '}
              <Link href="/me/import" className="link">import your Goodreads shelves</Link>.
            </Empty>
          )}
        </Section>

        <Section title="Your clubs" action={<Link href="/clubs/new" className="link text-sm">Start a club</Link>}>
          {feed.clubs.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {feed.clubs.map((c) => (
                <ClubCard key={c.id} club={c} />
              ))}
            </div>
          ) : (
            <Empty title="You're not in a club yet">
              <Link href="/clubs" className="link">Browse clubs</Link> near you, or start your own and invite your group.
            </Empty>
          )}
        </Section>

        {recs.clubs.length > 0 && feed.clubs.length > 0 && (
          <Section title="More clubs for you" action={<Link href="/discover" className="link text-sm">See all picks</Link>}>
            <div className="grid gap-4 sm:grid-cols-2">
              {recs.clubs.slice(0, 2).map((r) => (
                <RecClubCard key={r.club.id} rec={r} compact />
              ))}
            </div>
          </Section>
        )}
      </div>

      <aside>
        <Section title="Coming up" action={<Link href="/events" className="link text-sm">All events</Link>}>
          {feed.upcomingEvents.length ? (
            feed.upcomingEvents.map((e) => <EventCard key={e.id} event={e} />)
          ) : (
            <p className="text-sm text-muted">No upcoming events from your clubs or city.</p>
          )}
        </Section>
        <Section title={me.city ? `Popular in ${cityName(me.city)}` : 'Popular now'}>
          {feed.popularInCity.length ? (
            <div className="divide-y divide-line">
              {feed.popularInCity.map((p) => (
                <BookCard
                  key={p.book.id}
                  book={p.book}
                  note={[readersLabel(p.readingCount, p.fewReaders), p.clubsReadingCount ? `${p.clubsReadingCount} club${p.clubsReadingCount > 1 ? 's' : ''}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing yet — be the first to mark a book as reading.</p>
          )}
        </Section>
      </aside>
    </div>
  );
}
