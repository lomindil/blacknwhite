import type { ClubDetail, ThreadListItem } from '@bnw/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Empty } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { api, apiOrNotFound, requireMe } from '@/lib/server-api';
import { LiveRefresh } from './live-refresh';
import { NewThreadForm } from './new-thread';

export const metadata = { title: 'Discussion' };

export default async function DiscussionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMe(`/clubs/${slug}/discussion`);
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  if (!club.myRole) redirect(`/clubs/${slug}`);
  const threads = await api<ThreadListItem[]>(`/v1/clubs/${club.id}/threads`);
  const current = club.currentClubBook;
  const myChapter = current
    ? await api<{ myStatus: { currentChapter: number; status: string } | null }>(`/v1/books/${current.book.id}`).then((b) => b.myStatus)
    : null;

  const open = threads.filter((t): t is Extract<ThreadListItem, { locked: false }> => !t.locked);
  const locked = threads.filter((t): t is Extract<ThreadListItem, { locked: true }> => t.locked);
  const schedule = open.filter((t) => t.isSystem && t.bookId === current?.book.id).sort((a, b) => a.chapterGate - b.chapterGate);
  const others = open.filter((t) => !schedule.includes(t));

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <LiveRefresh room={`club:${club.id}`} event="thread:new" />
      <div>
        {current && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border border-line bg-soft p-4 text-sm">
            <span>
              {myChapter?.status === 'read'
                ? `You've finished ${current.book.title} — every thread is open to you.`
                : `You've finished chapter ${myChapter?.currentChapter ?? 0} of ${current.book.title}. Threads unlock as you read.`}
            </span>
            <Link href={`/books/${current.book.id}`} className="btn-ghost btn-sm">Update progress</Link>
          </div>
        )}

        {schedule.length > 0 && (
          <section className="mb-10">
            <h2 className="eyebrow mb-3">Reading schedule</h2>
            <ul className="divide-y divide-line border-y border-line">
              {schedule.map((t) => (
                <li key={t.id}>
                  <Link href={`/clubs/${slug}/threads/${t.id}`} className="flex items-baseline justify-between gap-4 py-3 hover:bg-soft">
                    <span className="font-serif text-lg">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted">{t.postCount} posts · {timeAgo(t.lastPostAt)}</span>
                  </Link>
                </li>
              ))}
              {locked
                .filter((t) => t.bookId === current?.book.id)
                .map((t) => (
                  <li key={t.id} className="flex items-baseline justify-between gap-4 py-3 text-muted">
                    <span className="font-serif text-lg">🔒 Unlocks at chapter {t.chapterGate}</span>
                    <span className="text-xs">Title hidden to avoid spoilers</span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="eyebrow mb-3">Conversations</h2>
          {others.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {others.map((t) => (
                <li key={t.id}>
                  <Link href={`/clubs/${slug}/threads/${t.id}`} className="block py-3 hover:bg-soft">
                    <div className="font-serif text-lg">{t.title}</div>
                    <div className="text-xs text-muted">
                      {t.author ? `${t.author.displayName} · ` : ''}
                      {t.postCount} posts · {timeAgo(t.lastPostAt)}
                      {t.chapterGate > 0 && ` · covers up to chapter ${t.chapterGate}`}
                    </div>
                  </Link>
                </li>
              ))}
              {locked
                .filter((t) => t.bookId !== current?.book.id)
                .map((t) => (
                  <li key={t.id} className="py-3 text-muted">🔒 A thread that unlocks at chapter {t.chapterGate}</li>
                ))}
            </ul>
          ) : (
            <Empty title="No conversations yet">Start one — about the book, a meetup, anything.</Empty>
          )}
        </section>
      </div>
      <aside>
        <NewThreadForm clubId={club.id} bookId={current?.book.id ?? null} bookTitle={current?.book.title ?? null} defaultGate={myChapter?.status === 'read' ? (current?.totalChapters ?? 0) : (myChapter?.currentChapter ?? 0)} slug={slug} />
      </aside>
    </div>
  );
}
