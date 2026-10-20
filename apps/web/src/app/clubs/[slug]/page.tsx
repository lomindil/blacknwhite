import type { BoardEntry, ClubDetail, EventSummary, Page, PollInfo, ThreadListItem } from '@bnw/shared';
import Link from 'next/link';
import { IconBook, IconCalendar, IconChat, IconLock, IconVote } from '@/components/icons';
import { Markdown } from '@/components/markdown';
import { Avatar, BookCover, EventCard } from '@/components/ui';
import { VotePollButton } from './polls/polls-client';
import { formatDate, timeAgo } from '@/lib/format';
import { api, apiOrNotFound } from '@/lib/server-api';

function CardTitle({ icon, title, tone, action }: { icon: React.ReactNode; title: string; tone: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
        <h3 className="font-serif text-lg font-medium">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export default async function ClubOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  const isMember = Boolean(club.myRole);
  const isAdmin = club.myRole === 'owner' || club.myRole === 'admin';
  const [events, threads, polls, board] = await Promise.all([
    api<Page<EventSummary>>(`/v1/events?clubId=${club.id}&limit=4`).catch(() => ({ items: [] as EventSummary[], nextCursor: null })),
    isMember ? api<ThreadListItem[]>(`/v1/clubs/${club.id}/threads`).catch(() => []) : Promise.resolve([] as ThreadListItem[]),
    isMember ? api<PollInfo[]>(`/v1/clubs/${club.id}/polls`).catch(() => []) : Promise.resolve([] as PollInfo[]),
    isMember
      ? api<Page<BoardEntry>>(`/v1/clubs/${club.id}/board?limit=3`).catch(() => ({ items: [] as BoardEntry[], nextCursor: null }))
      : Promise.resolve({ items: [] as BoardEntry[], nextCursor: null }),
  ]);
  const cb = club.currentClubBook;
  const today = new Date().toISOString().slice(0, 10);
  const thisWeek = cb?.weeks.filter((w) => w.startsOn <= today).at(-1);
  const recent = threads
    .filter((t): t is Extract<ThreadListItem, { locked: false }> => !t.locked && (!cb || t.bookId === cb.book.id))
    .slice(0, 4);
  const lockedCount = threads.filter((t) => t.locked && (!cb || t.bookId === cb.book.id)).length;
  const openPoll = polls.find((p) => !p.closed);
  const pastReads = club.history.filter((h) => !h.isCurrent);

  return (
    <div className="space-y-6">
      {/* About */}
      {club.description && (
        <section className="card relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-sage-600" aria-hidden />
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-sage-700">About this club</h2>
          <div className="text-[17px] leading-relaxed text-ink/90"><Markdown text={club.description} /></div>
        </section>
      )}

      {/* Reading now */}
      <section className="card overflow-hidden p-0">
        {cb ? (
          <div className="grid md:grid-cols-[13rem_minmax(0,1fr)]">
            <div className="relative flex items-center justify-center bg-sky-50 p-6">
              <div className="dots absolute inset-0 opacity-70" aria-hidden />
              <Link href={`/books/${cb.book.id}`} className="relative transition duration-300 hover:-translate-y-1 hover:rotate-[-2deg]">
                <BookCover book={cb.book} size="lg" />
              </Link>
            </div>
            <div className="p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Reading now</div>
                  <Link href={`/books/${cb.book.id}`} className="mt-1 block font-serif text-3xl font-medium leading-tight hover:underline">
                    {cb.book.title}
                  </Link>
                  <div className="mt-1 text-muted">{cb.book.authors.join(', ')}</div>
                </div>
                {isAdmin && (
                  <Link href={`/clubs/${club.slug}/settings#book`} className="btn-ghost btn-sm">
                    Change book
                  </Link>
                )}
              </div>
              <div className="mt-2 text-sm text-muted">
                {formatDate(cb.startsOn)} – {cb.endsOn ? formatDate(cb.endsOn) : 'ongoing'}
                {cb.chaptersPerWeek && ` · ${cb.chaptersPerWeek} chapters a week`}
              </div>

              {cb.weeks.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{thisWeek ? `Week ${thisWeek.week}: chapters ${thisWeek.fromChapter}–${thisWeek.toChapter}` : `Starts ${formatDate(cb.startsOn)}`}</span>
                    <span className="text-xs text-muted">{cb.weeks.length} weeks</span>
                  </div>
                  <ol className="flex gap-1" aria-label="Reading schedule">
                    {cb.weeks.map((w) => {
                      const state = !thisWeek || w.week > thisWeek.week ? 'next' : w.week === thisWeek.week ? 'now' : 'done';
                      return (
                        <li
                          key={w.week}
                          title={`Week ${w.week}: chapters ${w.fromChapter}–${w.toChapter} · ${formatDate(w.startsOn)}`}
                          className={`h-2.5 flex-1 rounded-full ${state === 'done' ? 'bg-sky-600' : state === 'now' ? 'animate-pulse bg-ochre-300' : 'bg-soft'}`}
                        >
                          <span className="sr-only">
                            Week {w.week}, chapters {w.fromChapter}–{w.toChapter}, {state === 'done' ? 'done' : state === 'now' ? 'this week' : 'upcoming'}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {isMember && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link href={`/clubs/${club.slug}/discussion`} className="btn">
                    Go to discussion
                  </Link>
                  <Link href={`/books/${cb.book.id}`} className="btn-ghost">
                    Update my progress
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="font-serif text-xl">No book picked yet</div>
            <p className="mt-1 text-muted">{isAdmin ? 'Pick a book and a weekly schedule, or run a poll first.' : 'The organizers are choosing the next book.'}</p>
            {isAdmin && (
              <div className="mt-4 flex justify-center gap-2">
                <Link href={`/clubs/${club.slug}/settings#book`} className="btn">Pick a book</Link>
                <Link href={`/clubs/${club.slug}/polls`} className="btn-ghost">Run a poll</Link>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Meetups */}
        <section className="card">
          <CardTitle
            icon={<IconCalendar size={16} />}
            tone="bg-clay-50 text-clay-700"
            title="Upcoming meetups"
            action={isAdmin && <Link href={`/events/new?clubId=${club.id}`} className="link text-sm">New</Link>}
          />
          {events.items.length ? (
            <div className="-my-2">{events.items.map((e) => <EventCard key={e.id} event={e} />)}</div>
          ) : (
            <p className="text-sm text-muted">No meetups scheduled yet.</p>
          )}
        </section>

        {/* Message board */}
        {isMember && (
          <section className="card">
            <CardTitle
              icon={<IconChat size={16} />}
              tone="bg-sage-50 text-sage-700"
              title="Message board"
              action={<Link href={`/clubs/${club.slug}/board`} className="link text-sm">Open</Link>}
            />
            {board.items.length ? (
              <ul className="space-y-3">
                {board.items.map((p) => (
                  <li key={p.id}>
                    <Link href={`/clubs/${club.slug}/board/${p.id}`} className="-mx-2 flex gap-3 rounded-xl px-2 py-1.5 transition hover:bg-soft">
                      <Avatar user={p.author} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted"><span className="font-medium text-ink">{p.author.displayName}</span> · {timeAgo(p.createdAt)}{p.commentCount > 0 && ` · ${p.commentCount} comment${p.commentCount > 1 ? 's' : ''}`}</div>
                        <div className="truncate font-medium">{p.title ?? 'Removed'}</div>
                        {p.body && <div className="line-clamp-1 text-sm text-muted">{p.body}</div>}
                      </div>
                      {p.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing yet. <Link href={`/clubs/${club.slug}/board`} className="link">Say hello</Link> to the club.</p>
            )}
          </section>
        )}

        {/* Poll */}
        {isMember && (
          <section className="card">
            <CardTitle
              icon={<IconVote size={16} />}
              tone="bg-ochre-50 text-ochre-700"
              title={openPoll ? 'Open poll' : 'Polls'}
              action={<Link href={`/clubs/${club.slug}/polls`} className="link text-sm">{openPoll ? 'All polls' : 'Start one'}</Link>}
            />
            {openPoll ? (
              <div>
                <div className="font-medium">{openPoll.question}</div>
                <div className="mt-3 space-y-2">
                  {openPoll.options.slice(0, 3).map((o) => {
                    const pct = openPoll.totalVotes ? Math.round((o.votes / openPoll.totalVotes) * 100) : 0;
                    return (
                      <div key={o.id} className="text-sm">
                        <div className="mb-1 flex justify-between"><span className="truncate">{o.label}</span><span className="text-muted">{pct}%</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-ochre-50"><div className="h-full rounded-full bg-ochre-300" style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted">{openPoll.totalVotes} votes{openPoll.myVote ? ' · you voted' : ''}</span>
                  <VotePollButton poll={openPoll} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">No open polls. Ask the club what to read next.</p>
            )}
          </section>
        )}

        {/* Book discussion */}
        {isMember && (
          <section className="card">
            <CardTitle
              icon={<IconBook size={16} />}
              tone="bg-plum-50 text-plum-700"
              title="Book discussion"
              action={<Link href={`/clubs/${club.slug}/discussion`} className="link text-sm">All threads</Link>}
            />
            {recent.length ? (
              <ul className="space-y-1">
                {recent.map((t) => (
                  <li key={t.id}>
                    <Link href={`/clubs/${club.slug}/threads/${t.id}`} className="-mx-2 flex items-baseline justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-soft">
                      <span className="truncate">{t.title}</span>
                      <span className="shrink-0 text-xs text-muted">{t.postCount} · {timeAgo(t.lastPostAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Threads appear when the club picks a book.</p>
            )}
            {lockedCount > 0 && <p className="mt-3 flex items-center gap-1.5 text-xs text-plum-700"><IconLock size={13} /> {lockedCount} more unlock as you read</p>}
          </section>
        )}
      </div>

      {pastReads.length > 0 && (
        <section className="card">
          <h3 className="mb-1 font-serif text-lg font-medium">Past reads</h3>
          {isMember && <p className="mb-4 text-sm text-muted">Open a book to browse — and add to — its discussion.</p>}
          <div className="flex gap-4 overflow-x-auto pb-1">
            {pastReads.map((h) => (
              <Link key={h.id} href={isMember ? `/clubs/${club.slug}/discussion?book=${h.book.id}` : `/books/${h.book.id}`} title={h.book.title} className="shrink-0 transition hover:-translate-y-1">
                <BookCover book={h.book} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
