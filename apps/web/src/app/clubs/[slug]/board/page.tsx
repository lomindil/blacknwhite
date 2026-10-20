import type { BoardEntry, ClubDetail, Page } from '@bnw/shared';
import { redirect } from 'next/navigation';
import { api, apiOrNotFound, requireMe } from '@/lib/server-api';
import { LiveRefresh } from '../discussion/live-refresh';
import { ClubSectionHeader } from '../tabs';
import { BoardComposer, BoardFeed } from './board-client';

export const metadata = { title: 'Message board' };

/** The club's general feed: anyone in the club can post, everyone can comment. */
export default async function BoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await requireMe(`/clubs/${slug}/board`);
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  if (!club.myRole) redirect(`/clubs/${slug}`);
  const feed = await api<Page<BoardEntry>>(`/v1/clubs/${club.id}/board?limit=30`);

  return (
    <div className="max-w-3xl">
      <LiveRefresh room={`club:${club.id}`} event={['board:new', 'board:reaction']} />
      <ClubSectionHeader
        title="Message board"
        subtitle="Announcements, meetup plans, recommendations, or just saying hello. Talk about the book goes in Book discussion, where spoilers are gated."
      />
      <BoardComposer clubId={club.id} me={me} />
      <BoardFeed clubId={club.id} slug={slug} initial={feed} canModerate={club.myRole !== 'member'} />
    </div>
  );
}
