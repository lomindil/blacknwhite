import type { ClubSummary, HomeFeed, Page } from '@bnw/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookCard, BookCover, ClubCard, Empty, EventCard, Section } from '@/components/ui';
import { cityName, readersLabel } from '@/lib/format';
import { api, getMe } from '@/lib/server-api';

export default async function HomePage() {
  const me = await getMe();
  if (!me) return <Landing />;
  if (!me.onboarded) redirect('/onboarding');
  const feed = await api<HomeFeed>('/v1/me/home');

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div>
        <div className="mb-8">
          <div className="eyebrow mb-2">{me.city ? cityName(me.city) : 'Welcome back'}</div>
          <h1 className="h1">Hello, {me.displayName.split(' ')[0]}.</h1>
        </div>

        <Section title="Currently reading" action={<Link href="/me/books" className="link text-sm">All shelves</Link>}>
          {feed.reading.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {feed.reading.map((r) => (
                <Link key={r.book.id} href={`/books/${r.book.id}`} className="card flex gap-4 transition hover:border-ink">
                  <BookCover book={r.book} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-serif">{r.book.title}</div>
                    <div className="text-xs text-muted">{r.book.authors[0]}</div>
                    <div className="mt-3 h-1 bg-soft">
                      <div className="h-1 bg-ink" style={{ width: `${r.progressPct}%` }} />
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

        {feed.suggestedClubs.length > 0 && (
          <Section title={me.city ? `Clubs in ${cityName(me.city)}` : 'Clubs you might like'}>
            <div className="grid gap-4 sm:grid-cols-2">
              {feed.suggestedClubs.map((c) => (
                <ClubCard key={c.id} club={c} />
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

async function Landing() {
  const clubs = await api<Page<ClubSummary>>('/v1/clubs?limit=6').catch(() => ({ items: [], nextCursor: null }));
  const cities = await api<{ city: string; name: string; clubs: number }[]>('/v1/cities').catch(() => []);
  return (
    <div>
      <section className="grid items-center gap-10 border-b border-line pb-14 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="eyebrow mb-4">Book clubs across India</div>
          <h1 className="font-serif text-4xl leading-[1.08] sm:text-6xl">
            Goodreads tracks what you read.
            <br />
            <span className="text-muted">We help you read together.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            With your club, in your city, in your language. Run your club without chasing people on WhatsApp, discuss without spoilers,
            and find meetups and bookstores near you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn px-6 py-3 text-base">Continue with Google</Link>
            <Link href="/clubs" className="btn-ghost px-6 py-3 text-base">Browse clubs</Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3" aria-hidden>
          {['The God of Small Things', 'Pather Panchali', 'Godaan', 'Ponniyin Selvan', 'Chemmeen', 'Samskara'].map((t, i) => (
            <div key={t} className={i % 2 ? 'mt-6' : ''}>
              <BookCover book={{ title: t, authors: [''], coverUrl: null }} />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 border-b border-line py-14 md:grid-cols-3">
        {[
          ['Spoiler-safe threads', "Discussion unlocks chapter by chapter. You only see threads up to where you've read."],
          ['Club tools that replace the chase', 'Schedules, polls, RSVPs and WhatsApp reminders. Members stay where they already are.'],
          ['The Indian layer', 'Clubs, events and bookstores in your city, books in your language, and the best price to buy.'],
        ].map(([t, d]) => (
          <div key={t}>
            <h2 className="h3 mb-2">{t}</h2>
            <p className="text-muted">{d}</p>
          </div>
        ))}
      </section>

      {clubs.items.length > 0 && (
        <section className="py-14">
          <Section title="Clubs reading now" action={<Link href="/clubs" className="link text-sm">See all</Link>}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clubs.items.map((c) => (
                <ClubCard key={c.id} club={c} />
              ))}
            </div>
          </Section>
        </section>
      )}

      {cities.length > 0 && (
        <section>
          <Section title="Find readers near you">
            <div className="flex flex-wrap gap-2">
              {cities.map((c) => (
                <Link key={c.city} href={`/cities/${c.city}`} className="btn-ghost">
                  {c.name}
                  {c.clubs > 0 && <span className="text-muted">{c.clubs}</span>}
                </Link>
              ))}
            </div>
          </Section>
        </section>
      )}
    </div>
  );
}
