import type { ClubDetail, Page, PostItem, ThreadDetail } from '@bnw/shared';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiOrNotFound, requireMe, ServerApiError, api } from '@/lib/server-api';
import { ThreadView } from './thread-view';
import { IconLock } from '@/components/icons';

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
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-plum-50 text-plum-700"><IconLock size={30} /></span>
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
    <div className="max-w-4xl">
      <Link href={`/clubs/${slug}/discussion`} className="text-sm text-muted transition hover:text-ink">← All discussion</Link>
      <header className="mt-3 animate-fade-up border-b border-line pb-5">
        <h2 className="font-serif text-3xl font-medium leading-tight tracking-tight">{thread.title}</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {thread.book && <span className="chip border-sky-200 bg-sky-50 text-sky-700">{thread.book.title}</span>}
          <span className="chip border-plum-200 bg-plum-50 text-plum-700">{thread.chapterGate > 0 ? `Spoilers up to chapter ${thread.chapterGate}` : 'Spoiler-free'}</span>
          {thread.myChapter !== null && <span className="chip">You've finished chapter {thread.myChapter}</span>}
        </div>
      </header>
      <ThreadView thread={thread} initial={posts} meId={me.id} canModerate={isAdmin} />
    </div>
  );
}
