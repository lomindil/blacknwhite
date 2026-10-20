import type { CityPage } from '@bnw/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookCard, ClubCard, Empty, EventCard, PageHeader, Section } from '@/components/ui';
import { cityName, languageName, readersLabel } from '@/lib/format';
import { api } from '@/lib/server-api';

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const name = cityName(city);
  return {
    title: `Book clubs in ${name}`,
    description: `Join a book club in ${name}. Reading meetups, silent reading hours, author talks and independent bookstores in ${name}.`,
  };
}

/** Server-rendered city landing page for SEO ("Book clubs in <city>"). */
export default async function CityLanding({ params }: Props) {
  const { city } = await params;
  const page = await api<CityPage>(`/v1/cities/${encodeURIComponent(city)}`);

  return (
    <div>
      <PageHeader eyebrow="City guide" title={`Book clubs in ${page.name}`} actions={<Link href="/clubs/new" className="btn">Start a club in {page.name}</Link>}>
        {page.clubs.length
          ? `${page.clubs.length} public club${page.clubs.length > 1 ? 's' : ''}, ${page.events.length} upcoming event${page.events.length === 1 ? '' : 's'} and ${page.bookstores.length} bookstore${page.bookstores.length === 1 ? '' : 's'}.`
          : `No clubs in ${page.name} yet — yours could be the first.`}
      </PageHeader>
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <Section title="Clubs">
            {page.clubs.length ? (
              <div className="grid gap-4 sm:grid-cols-2">{page.clubs.map((c) => <ClubCard key={c.id} club={c} />)}</div>
            ) : (
              <Empty title={`Start the first club in ${page.name}`}>Organizers bring their group; we bring the tools.</Empty>
            )}
          </Section>
          <Section title="Bookstores" action={<Link href={`/bookstores?city=${page.city}`} className="link text-sm">All</Link>}>
            {page.bookstores.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {page.bookstores.map((b) => (
                  <li key={b.id}>
                    <Link href={`/bookstores/${b.slug}`} className="flex justify-between gap-3 py-3 hover:bg-soft">
                      <span className="font-serif">{b.name}</span>
                      <span className="text-sm text-muted">{[b.area, b.secondhand ? 'secondhand' : null, ...b.languages.map(languageName)].filter(Boolean).join(' · ')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No bookstores listed yet.</p>
            )}
          </Section>
        </div>
        <aside>
          <Section title="This week and next" action={<Link href={`/events?city=${page.city}`} className="link text-sm">All</Link>}>
            {page.events.length ? page.events.map((e) => <EventCard key={e.id} event={e} />) : <p className="text-sm text-muted">No upcoming events.</p>}
          </Section>
          {page.popularBooks.length > 0 && (
            <Section title={`What ${page.name} is reading`}>
              <div className="divide-y divide-line">
                {page.popularBooks.map((p) => (
                  <BookCard key={p.book.id} book={p.book} note={[readersLabel(p.readingCount, p.fewReaders), p.clubsReadingCount ? `${p.clubsReadingCount} club${p.clubsReadingCount > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')} />
                ))}
              </div>
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}
