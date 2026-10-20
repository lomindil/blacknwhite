import type { BookDetail, ClubBookInfo, ClubDetail, ThreadListItem } from '@bnw/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IconLock } from '@/components/icons';
import { Avatar, BookCover, Empty } from '@/components/ui';
import { formatDate, timeAgo } from '@/lib/format';
import { api, apiOrNotFound, requireMe } from '@/lib/server-api';
import { ClubSectionHeader } from '../tabs';
import { LiveRefresh } from './live-refresh';

export const metadata = { title: 'Book discussion' };

type Open = Extract<ThreadListItem, { locked: false }>;
type Locked = Extract<ThreadListItem, { locked: true }>;

/**
 * Book discussion: the current book's weekly threads, plus an archive of every earlier book
 * the club has read. Archived threads stay open — readers can catch up and keep posting.
 */
export default async function DiscussionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ book?: string }> }) {
  const { slug } = await params;
  const { book: bookParam } = await searchParams;
  await requireMe(`/clubs/${slug}/discussion`);
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  if (!club.myRole) redirect(`/clubs/${slug}`);
  const threads = await api<ThreadListItem[]>(`/v1/clubs/${club.id}/threads`);

  const current = club.currentClubBook;
  const past = club.history.filter((h) => !h.isCurrent);
  const selected: ClubBookInfo | null = (bookParam && club.history.find((h) => h.book.id === bookParam)) || current || past[0] || null;
  const isArchive = Boolean(selected && !selected.isCurrent);
  const myStatus = selected ? await api<BookDetail>(`/v1/books/${selected.book.id}`).then((b) => b.myStatus).catch(() => null) : null;

  const forBook = (bookId: string | null) => ({
    open: threads.filter((t): t is Open => !t.locked && t.bookId === bookId).sort((a, b) => a.chapterGate - b.chapterGate || (a.createdAt < b.createdAt ? -1 : 1)),
    locked: threads.filter((t): t is Locked => t.locked && t.bookId === bookId),
  });
  const sel = forBook(selected?.book.id ?? null);
  const general = threads.filter((t): t is Open => !t.locked && t.bookId === null);
  const finished = myStatus?.status === 'read';
  const stats = (bookId: string) => {
    const b = forBook(bookId);
    return { threads: b.open.length + b.locked.length, posts: b.open.reduce((n, t) => n + t.postCount, 0), locked: b.locked.length };
  };

  return (
    <div>
      <LiveRefresh room={`club:${club.id}`} event="thread:new" />
      <ClubSectionHeader
        title={isArchive ? 'From the archive' : 'Book discussion'}
        subtitle={
          selected
            ? finished
              ? `You've finished ${selected.book.title} — every thread is open to you.`
              : `You've finished chapter ${myStatus?.currentChapter ?? 0} of ${selected.book.title}. Threads unlock as you read.`
            : 'Pick a book in Manage to start the weekly threads.'
        }
        actions={
          <>
            {isArchive && current && <Link href={`/clubs/${slug}/discussion`} className="btn-ghost btn-sm">Back to {current.book.title}</Link>}
            {selected && <Link href={`/books/${selected.book.id}`} className="btn-ghost btn-sm">{finished ? 'Book page' : 'Update progress'}</Link>}
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          {selected ? (
            <section className="card overflow-hidden p-0">
              <div className={`flex items-center gap-4 border-b border-line/70 px-5 py-4 ${isArchive ? 'bg-ochre-50/60' : 'bg-sky-50/60'}`}>
                <BookCover book={selected.book} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isArchive ? 'text-ochre-700' : 'text-sky-700'}`}>
                    {isArchive ? `Read ${formatDate(selected.startsOn)}${selected.endsOn ? ` – ${formatDate(selected.endsOn)}` : ''}` : 'Reading now'}
                  </div>
                  <div className="truncate font-serif text-xl">{selected.book.title}</div>
                </div>
              </div>
              {sel.open.length || sel.locked.length ? (
                <ul className="divide-y divide-line/70">
                  {sel.open.map((t) => (
                    <li key={t.id}>
                      <Link href={`/clubs/${slug}/threads/${t.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-sky-50/50">
                        {t.isSystem || !t.author ? null : <Avatar user={t.author} size={28} />}
                        <span className="min-w-0 flex-1 truncate font-serif text-[17px]">{t.title}</span>
                        <span className="shrink-0 rounded-full bg-soft px-2.5 py-0.5 text-xs text-muted">{t.postCount} · {timeAgo(t.lastPostAt)}</span>
                      </Link>
                    </li>
                  ))}
                  {sel.locked.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-muted">
                      <span className="flex items-center gap-2 font-serif text-[17px]"><IconLock size={15} className="text-plum-600" /> Unlocks at chapter {t.chapterGate}</span>
                      <span className="text-xs">Title hidden</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-sm text-muted">No threads for this book.</p>
              )}
              {isArchive && sel.locked.length > 0 && (
                <div className="border-t border-line/70 bg-paper px-5 py-3 text-sm text-muted">
                  Read it already? <Link href={`/books/${selected.book.id}`} className="link">Mark it as finished</Link> to open every thread.
                </div>
              )}
            </section>
          ) : (
            <Empty title="No book yet">Once the club picks a book, weekly spoiler-gated threads appear here.</Empty>
          )}

          {general.length > 0 && (
            <section className="card p-0">
              <h3 className="border-b border-line/70 px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Earlier conversations</h3>
              <ul className="divide-y divide-line/70">
                {general.map((t) => (
                  <li key={t.id}>
                    <Link href={`/clubs/${slug}/threads/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-soft">
                      <span className="truncate">{t.title}</span>
                      <span className="shrink-0 text-xs text-muted">{t.postCount} · {timeAgo(t.lastPostAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="border-t border-line/70 px-5 py-3 text-xs text-muted">
                New general posts go on the <Link href={`/clubs/${slug}/board`} className="link">message board</Link>.
              </p>
            </section>
          )}
        </div>

        {/* Archive */}
        <aside className="card p-0">
          <h3 className="border-b border-line/70 px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-ochre-700">Archive</h3>
          {past.length || current ? (
            <ul className="p-2">
              {[...(current ? [current] : []), ...past].map((h) => {
                const s = stats(h.book.id);
                const active = selected?.id === h.id;
                return (
                  <li key={h.id}>
                    <Link
                      href={h.isCurrent ? `/clubs/${slug}/discussion` : `/clubs/${slug}/discussion?book=${h.book.id}`}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-xl p-2.5 transition ${active ? 'bg-ochre-50 ring-1 ring-ochre-200' : 'hover:bg-soft'}`}
                    >
                      <BookCover book={h.book} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-serif">{h.book.title}</div>
                        <div className="text-xs text-muted">{h.isCurrent ? 'Reading now' : formatDate(h.startsOn)}</div>
                        <div className="text-xs text-muted">{s.threads} threads · {s.posts} posts</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {!past.length && <p className="border-t border-line/70 px-5 py-3 text-xs text-muted">Books the club finishes are kept here, with their discussions.</p>}
        </aside>
      </div>
    </div>
  );
}
