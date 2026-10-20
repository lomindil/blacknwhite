import type { ClubDetail, PollInfo } from '@bnw/shared';
import { redirect } from 'next/navigation';
import { Empty } from '@/components/ui';
import { api, apiOrNotFound, requireMe } from '@/lib/server-api';
import { ClubSectionHeader } from '../tabs';
import { NewPollPanel, PollCard } from './polls-client';

export const metadata = { title: 'Polls' };

export default async function PollsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await requireMe(`/clubs/${slug}/polls`);
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  if (!club.myRole) redirect(`/clubs/${slug}`);
  const polls = await api<PollInfo[]>(`/v1/clubs/${club.id}/polls`);
  const isAdmin = club.myRole !== 'member';

  return (
    <div>
      <ClubSectionHeader title="Polls" subtitle="Decide together — what to read next, when to meet, and anything else." />
      <NewPollPanel clubId={club.id} />
      {polls.length ? (
        <>
          {polls.some((p) => !p.closed) && (
            <section className="mt-8">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ochre-700">Open</h3>
              <div className="grid items-start gap-5 xl:grid-cols-2">
                {polls.filter((p) => !p.closed).map((p) => <PollCard key={p.id} poll={p} canClose={isAdmin || p.createdBy.id === me.id} canSetBook={isAdmin} clubSlug={slug} />)}
              </div>
            </section>
          )}
          {polls.some((p) => p.closed) && (
            <section className="mt-8">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Past results</h3>
              <div className="grid items-start gap-5 xl:grid-cols-2">
                {polls.filter((p) => p.closed).map((p) => <PollCard key={p.id} poll={p} canClose={false} canSetBook={isAdmin} clubSlug={slug} />)}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="mt-6"><Empty title="No polls yet">Ask the club what to read next, or when to meet.</Empty></div>
      )}
    </div>
  );
}
