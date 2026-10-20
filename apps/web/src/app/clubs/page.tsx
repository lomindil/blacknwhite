import type { ClubSummary, Page } from '@bnw/shared';
import { CITIES, LANGUAGES } from '@bnw/shared';
import Link from 'next/link';
import { ClubCard, Empty, PageHeader } from '@/components/ui';
import { cityName } from '@/lib/format';
import { api, getMe } from '@/lib/server-api';

export const metadata = { title: 'Book clubs' };

type SP = { city?: string; language?: string; q?: string; cursor?: string };

export default async function ClubsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const me = await getMe();
  const city = sp.city === undefined ? (me?.city ?? '') : sp.city;
  const params = new URLSearchParams({ limit: '24' });
  if (city) params.set('city', city);
  if (sp.language) params.set('language', sp.language);
  if (sp.q) params.set('q', sp.q);
  if (sp.cursor) params.set('cursor', sp.cursor);
  const page = await api<Page<ClubSummary>>(`/v1/clubs?${params}`);
  const nextParams = new URLSearchParams({ ...(city ? { city } : { city: '' }), ...(sp.language ? { language: sp.language } : {}), ...(sp.q ? { q: sp.q } : {}) });

  return (
    <div>
      <PageHeader
        eyebrow="Discover"
        title={city ? `Book clubs in ${cityName(city)}` : 'Book clubs'}
        actions={<Link href={me ? '/clubs/new' : '/login?next=/clubs/new'} className="btn">Start a club</Link>}
      >
        Public clubs you can join today. Private clubs are invite-only and aren't listed.
      </PageHeader>
      <form className="mb-8 grid gap-2 sm:grid-cols-[1fr_12rem_12rem_auto]" action="/clubs">
        <input name="q" defaultValue={sp.q} className="input" placeholder="Search clubs by name, book or topic" />
        <select name="city" defaultValue={city} className="input" aria-label="City">
          <option value="">All cities</option>
          {CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="language" defaultValue={sp.language ?? ''} className="input" aria-label="Language">
          <option value="">Any language</option>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <button className="btn">Filter</button>
      </form>
      {page.items.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.items.map((c) => <ClubCard key={c.id} club={c} />)}
          </div>
          {page.nextCursor && (
            <div className="mt-8 text-center">
              <Link className="btn-ghost" href={`/clubs?${nextParams}&cursor=${page.nextCursor}`}>More clubs</Link>
            </div>
          )}
        </>
      ) : (
        <Empty title="No clubs here yet">
          {city ? <>Be the first in {cityName(city)}: <Link href="/clubs/new" className="link">start a club</Link>, or <Link href="/clubs?city=" className="link">see all cities</Link>.</> : 'Start one and invite your group.'}
        </Empty>
      )}
    </div>
  );
}
