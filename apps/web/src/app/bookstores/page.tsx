import type { BookstoreSummary } from '@bnw/shared';
import { CITIES } from '@bnw/shared';
import Link from 'next/link';
import { Empty, PageHeader } from '@/components/ui';
import { cityName, languageName } from '@/lib/format';
import { api, getMe } from '@/lib/server-api';

export const metadata = { title: 'Bookstores' };

export default async function BookstoresPage({ searchParams }: { searchParams: Promise<{ city?: string; q?: string }> }) {
  const sp = await searchParams;
  const me = await getMe();
  const city = sp.city === undefined ? (me?.city ?? '') : sp.city;
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (sp.q) params.set('q', sp.q);
  const stores = await api<BookstoreSummary[]>(`/v1/bookstores?${params}`);

  return (
    <div>
      <PageHeader eyebrow="Directory" title={city ? `Bookstores in ${cityName(city)}` : 'Independent bookstores'}>
        Indie and secondhand stores that host readings, swaps and club meetups.
      </PageHeader>
      <form action="/bookstores" className="mb-8 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} className="input max-w-xs" placeholder="Store name" />
        <select name="city" defaultValue={city} className="input w-56" aria-label="City">
          <option value="">All cities</option>
          {CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <button className="btn-ghost">Search</button>
      </form>
      {stores.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((s) => (
            <Link key={s.id} href={`/bookstores/${s.slug}`} className="card card-hover group">
              <div className="h3 group-hover:underline">{s.name}</div>
              <div className="mt-1 text-sm text-muted">{[s.area, cityName(s.city)].filter(Boolean).join(', ')}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {s.secondhand && <span className="chip">Secondhand</span>}
                {s.languages.map((l) => <span key={l} className="chip">{languageName(l)}</span>)}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="No bookstores listed here yet">Own a bookstore? Write to us to get a free listing.</Empty>
      )}
    </div>
  );
}
