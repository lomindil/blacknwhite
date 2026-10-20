import type { BookstoreDetail } from '@bnw/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EventCard, Section } from '@/components/ui';
import { cityName, languageName } from '@/lib/format';
import { api, apiOrNotFound } from '@/lib/server-api';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await api<BookstoreDetail>(`/v1/bookstores/${slug}`).catch(() => null);
  return b ? { title: `${b.name}, ${cityName(b.city)}`, description: b.description ?? undefined } : {};
}

export default async function BookstorePage({ params }: Props) {
  const { slug } = await params;
  const b = await apiOrNotFound<BookstoreDetail>(`/v1/bookstores/${slug}`);
  const mapsUrl = b.lat && b.lng ? `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name} ${b.address}`)}`;

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_18rem]">
      <div>
        <div className="eyebrow mb-2">{[b.area, cityName(b.city)].filter(Boolean).join(' · ')}</div>
        <h1 className="h1">{b.name}</h1>
        <div className="mt-3 flex flex-wrap gap-1">
          {b.secondhand && <span className="chip">Secondhand</span>}
          {b.languages.map((l) => <span key={l} className="chip">{languageName(l)}</span>)}
        </div>
        {b.description && <p className="mt-6 max-w-2xl leading-relaxed">{b.description}</p>}
        <div className="mt-10">
          <Section title="Upcoming at this store" action={b.canManage && <Link href={`/events/new?bookstoreId=${b.id}`} className="link text-sm">Post an event</Link>}>
            {b.upcomingEvents.length ? b.upcomingEvents.map((e) => <EventCard key={e.id} event={e} />) : <p className="text-sm text-muted">No events scheduled.</p>}
          </Section>
        </div>
      </div>
      <aside className="card h-fit space-y-4 text-sm">
        <div><div className="label">Address</div>{b.address}</div>
        {b.hours && <div><div className="label">Hours</div>{b.hours}</div>}
        {b.phone && <div><div className="label">Phone</div><a href={`tel:${b.phone}`} className="link">{b.phone}</a></div>}
        {b.website && <div><div className="label">Website</div><a href={b.website} className="link break-all" target="_blank" rel="noopener noreferrer">{b.website.replace(/^https?:\/\//, '')}</a></div>}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">Open in Maps</a>
      </aside>
    </div>
  );
}
