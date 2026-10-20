import { CITIES } from '@bnw/shared';
import Link from 'next/link';
import { PageHeader } from '@/components/ui';
import { api } from '@/lib/server-api';

export const metadata = { title: 'Book clubs by city', description: 'Find book clubs, reading meetups and independent bookstores in cities across India.' };

export default async function CitiesPage() {
  const active = await api<{ city: string; name: string; clubs: number; bookstores: number }[]>('/v1/cities');
  const activeSet = new Set(active.map((a) => a.city));
  const rest = CITIES.filter((c) => !activeSet.has(c.slug));

  return (
    <div>
      <PageHeader eyebrow="Across India" title="Find readers in your city">
        Wherever there's a reading community, there's a place for it here.
      </PageHeader>
      {active.length > 0 && (
        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {active.map((c) => (
            <Link key={c.city} href={`/cities/${c.city}`} className="card group transition hover:border-ink">
              <div className="h3 group-hover:underline">{c.name}</div>
              <div className="mt-1 text-sm text-muted">
                {c.clubs} club{c.clubs === 1 ? '' : 's'} · {c.bookstores} bookstore{c.bookstores === 1 ? '' : 's'}
              </div>
            </Link>
          ))}
        </div>
      )}
      <h2 className="eyebrow mb-3">More cities</h2>
      <div className="flex flex-wrap gap-2">
        {rest.map((c) => (
          <Link key={c.slug} href={`/cities/${c.slug}`} className="btn-ghost btn-sm">{c.name}</Link>
        ))}
      </div>
    </div>
  );
}
