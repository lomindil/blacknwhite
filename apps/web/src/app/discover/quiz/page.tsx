import type { ReadingProfile, Recommendations } from '@bnw/shared';
import { api, requireMe } from '@/lib/server-api';
import { Quiz } from './quiz';

export const metadata = { title: 'Get matched' };

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const me = await requireMe('/discover/quiz');
  const [{ profile }, recs, { welcome }] = await Promise.all([
    api<{ profile: ReadingProfile | null }>('/v1/me/reading-profile'),
    api<Recommendations>('/v1/me/recommendations'),
    searchParams,
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <Quiz
        firstName={me.displayName.split(' ')[0]}
        welcome={Boolean(welcome)}
        profile={profile}
        genres={me.genres.length ? me.genres : recs.signals.topGenres.slice(0, 3)}
        languages={me.languages}
        signals={recs.signals}
      />
    </div>
  );
}
