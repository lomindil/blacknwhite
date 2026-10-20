import type { BoardEntry, ClubDetail } from '@bnw/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiOrNotFound, requireMe } from '@/lib/server-api';
import { LiveRefresh } from '../../discussion/live-refresh';
import { PostDetail } from '../board-client';

export const metadata = { title: 'Post' };

export default async function BoardPostPage({ params }: { params: Promise<{ slug: string; postId: string }> }) {
  const { slug, postId } = await params;
  await requireMe(`/clubs/${slug}/board/${postId}`);
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  if (!club.myRole) redirect(`/clubs/${slug}`);
  const post = await apiOrNotFound<BoardEntry & { clubId: string }>(`/v1/board-posts/${postId}`);
  if (post.clubId !== club.id) redirect(`/clubs/${slug}/board`);

  return (
    <div className="max-w-3xl">
      <LiveRefresh room={`club:${club.id}`} event={['board:new', 'board:reaction']} />
      <Link href={`/clubs/${slug}/board`} className="mb-4 inline-block text-sm text-muted transition hover:text-ink">
        ← Message board
      </Link>
      <PostDetail post={post} slug={slug} canModerate={club.myRole !== 'member'} />
    </div>
  );
}
