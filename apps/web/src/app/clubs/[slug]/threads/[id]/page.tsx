import type { ClubDetail, Page, PostItem, ThreadDetail } from '@bnw/shared';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiOrNotFound, requireMe, ServerApiError, api } from '@/lib/server-api';
import { ThreadView } from './thread-view';

export default async function ThreadPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const me = await requireMe(`/clubs/${slug}/threads/${id}`);
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  let thread: ThreadDetail;
  try {
    thread = await api<ThreadDetail>(`/v1/threads/${id}`);
  } catch (e) {
    if (e instanceof ServerApiError && e.code === 'SPOILER_LOCKED') {
      const gate = (e.details as { chapterGate: number }).chapterGate;
      return (
        <div className="mx-auto max-w-lg py-10 text-center">
          <div className="text-4xl">🔒</div>
          <h1 className="h2 mt-4">Unlocks at chapter {gate}</h1>
          <p className="mt-2 text-muted">This thread discusses chapters you haven't finished yet. Mark your progress to open it.</p>
          {club.currentBook && <Link href={`/books/${club.currentBook.id}`} className="btn mt-6">Update my progress</Link>}
        </div>
      );
    }
    if (e instanceof ServerApiError && e.status === 403) redirect(`/clubs/${slug}`);
    if (e instanceof ServerApiError && e.status === 404) notFound();
    throw e;
  }
  const posts = await api<Page<PostItem>>(`/v1/threads/${id}/posts?limit=100`);
  const isAdmin = club.myRole === 'owner' || club.myRole === 'admin';

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/clubs/${slug}/discussion`} className="text-sm text-muted hover:text-ink">← All discussion</Link>
      <h1 className="h1 mt-3">{thread.title}</h1>
      <div className="mt-2 text-sm text-muted">
        {thread.book && <>{thread.book.title} · </>}
        {thread.chapterGate > 0 ? `Spoilers up to chapter ${thread.chapterGate}` : 'Spoiler-free'}
        {thread.myChapter !== null && ` · you've finished chapter ${thread.myChapter}`}
      </div>
      <ThreadView thread={thread} initial={posts} meId={me.id} canModerate={isAdmin} />
    </div>
  );
}
