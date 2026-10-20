import type { EventSummary, Page } from '@bnw/shared';
import { CITIES } from '@bnw/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Empty, EventCard, PageHeader } from '@/components/ui';
import { cityName } from '@/lib/format';
import { api, getMe } from '@/lib/server-api';

type SP = { city?: string; cursor?: string; week?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const { city } = await searchParams;
  return { title: city ? `Book events in ${cityName(city)}` : 'Book events' };
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const me = await getMe();
  const city = sp.city === undefined ? (me?.city ?? '') : sp.city;
  const params = new URLSearchParams({ limit: '30' });
  if (city) params.set('city', city);
  if (sp.week) params.set('to', new Date(Date.now() + 7 * 86400000).toISOString());
  if (sp.cursor) params.set('cursor', sp.cursor);
  const page = await api<Page<EventSummary>>(`/v1/events?${params}`);

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Meet readers"
        title={city ? `Book events in ${cityName(city)}${sp.week ? ' this week' : ''}` : 'Book events'}
        actions={me && <Link href="/events/new" className="btn">Host an event</Link>}
      >
        Club meetups, silent reading hours, author talks and book swaps.
      </PageHeader>
      <form action="/events" className="mb-6 flex flex-wrap gap-2">
        <select name="city" defaultValue={city} className="input w-56" aria-label="City">
          <option value="">All cities and online</option>
          {CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="week" value="1" defaultChecked={Boolean(sp.week)} /> This week only
        </label>
        <button className="btn-ghost">Show</button>
      </form>
      {page.items.length ? (
        <div className="border-t border-line">
          {page.items.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      ) : (
        <Empty title="No upcoming events here">Clubs and bookstores post meetups here. Run a club? Host one.</Empty>
      )}
      {page.nextCursor && (
        <div className="mt-6 text-center">
          <Link className="btn-ghost" href={`/events?city=${city}${sp.week ? '&week=1' : ''}&cursor=${page.nextCursor}`}>More events</Link>
        </div>
      )}
    </div>
  );
}
