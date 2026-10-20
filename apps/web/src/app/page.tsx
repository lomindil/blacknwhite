import type { ClubSummary, Page } from '@bnw/shared';
import { Landing } from '@/components/landing/landing';
import { api, getMe } from '@/lib/server-api';

/** The landing page, for everyone — signed-in readers reach it from the logo too. */
export default async function LandingPage() {
  const [me, clubs, cities] = await Promise.all([
    getMe(),
    api<Page<ClubSummary>>('/v1/clubs?limit=6').catch(() => ({ items: [] as ClubSummary[], nextCursor: null })),
    api<{ city: string; name: string; clubs: number }[]>('/v1/cities').catch(() => []),
  ]);
  return <Landing clubs={clubs.items} cities={cities} signedIn={Boolean(me)} />;
}
