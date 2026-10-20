import type { ClubDetail, ThreadListItem } from '@bnw/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IconLock } from '@/components/icons';
import { Avatar, Empty } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { api, apiOrNotFound, requireMe } from '@/lib/server-api';
import { ClubSectionHeader } from '../tabs';
import { LiveRefresh } from './live-refresh';
import { NewThreadForm } from './new-thread';

export const metadata = { title: 'Discussion' };

type Open = Extract<ThreadListItem, { locked: false }>;

export default async function DiscussionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMe(`/clubs/${slug}/discussion`);
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  if (!club.myRole) redirect(`/clubs/${slug}`);
  const threads = await api<ThreadListItem[]>(`/v1/clubs/${club.id}/threads`);
  const current = club.currentClubBook;
  const myStatus = current
    ? await api<{ myStatus: { currentChapter: number; status: string } | null }>(`/v1/books/${current.book.id}`).then((b) => b.myStatus)
    : null;

  const open = threads.filter((t): t is Open => !t.locked);
  const locked = threads.filter((t): t is Extract<ThreadListItem, { locked: true }> => t.locked);
  const schedule = open.filter((t) => t.isSystem && t.bookId === current?.book.id).sort((a, b) => a.chapterGate - b.chapterGate);
  const others = open.filter((t) => !schedule.includes(t));
  const lockedSchedule = locked.filter((t) => t.bookId === current?.book.id);
  const finished = myStatus?.status === 'read';
  const defaultGate = finished ? (current?.totalChapters ?? 0) : (myStatus?.currentChapter ?? 0);

  return (
    <div>
      <LiveRefresh room={`club:${club.id}`} event="thread:new" />
      <ClubSectionHeader
        title="Discussion"
        subtitle={
          current
            ? finished
              ? `You've finished ${current.book.title} — every thread is open to you.`
              : `You've finished chapter ${myStatus?.currentChapter ?? 0} of ${current.book.title}. Threads unlock as you read.`
            : 'Talk about the book, plan meetups, or anything else.'
        }
        actions={current && <Link href={`/books/${current.book.id}`} className="btn-ghost btn-sm">Update progress</Link>}
      />

      <NewThreadForm clubId={club.id} bookId={current?.book.id ?? null} bookTitle={current?.book.title ?? null} defaultGate={defaultGate} slug={slug} />

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
        {(schedule.length > 0 || lockedSchedule.length > 0) && (
          <section className="card p-0">
            <h3 className="border-b border-line/70 px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Reading schedule</h3>
            <ul className="divide-y divide-line/70">
              {schedule.map((t) => (
                <li key={t.id}>
                  <Link href={`/clubs/${slug}/threads/${t.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-sky-50/60">
                    <span className="font-serif text-[17px]">{t.title}</span>
                    <span className="shrink-0 rounded-full bg-soft px-2.5 py-0.5 text-xs text-muted">{t.postCount} · {timeAgo(t.lastPostAt)}</span>
                  </Link>
                </li>
              ))}
              {lockedSchedule.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-muted">
                  <span className="flex items-center gap-2 font-serif text-[17px]"><IconLock size={15} className="text-plum-600" /> Unlocks at chapter {t.chapterGate}</span>
                  <span className="text-xs">Title hidden</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-0">
          <h3 className="border-b border-line/70 px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-plum-700">Conversations</h3>
          {others.length || locked.length > lockedSchedule.length ? (
            <ul className="divide-y divide-line/70">
              {others.map((t) => (
                <li key={t.id}>
                  <Link href={`/clubs/${slug}/threads/${t.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-plum-50/50">
                    {t.author ? <Avatar user={t.author} size={32} /> : <span className="h-8 w-8 rounded-full bg-soft" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-serif text-[17px]">{t.title}</div>
                      <div className="text-xs text-muted">
                        {t.author ? `${t.author.displayName} · ` : ''}
                        {t.postCount} posts · {timeAgo(t.lastPostAt)}
                        {t.chapterGate > 0 && ` · up to ch. ${t.chapterGate}`}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
              {locked
                .filter((t) => t.bookId !== current?.book.id)
                .map((t) => (
                  <li key={t.id} className="flex items-center gap-2 px-5 py-3.5 text-sm text-muted">
                    <IconLock size={15} className="text-plum-600" /> A thread that unlocks at chapter {t.chapterGate}
                  </li>
                ))}
            </ul>
          ) : (
            <div className="p-5">
              <Empty title="No conversations yet">Start one — about the book, a meetup, anything.</Empty>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
