import type { ClubDetail, EventSummary, Page } from '@bnw/shared';
import Link from 'next/link';
import { Markdown } from '@/components/markdown';
import { BookCover, Empty, EventCard, Section } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { api, apiOrNotFound } from '@/lib/server-api';

export default async function ClubOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  const events = await api<Page<EventSummary>>(`/v1/events?clubId=${club.id}&limit=5`).catch(() => ({ items: [], nextCursor: null }));
  const cb = club.currentClubBook;
  const today = new Date().toISOString().slice(0, 10);
  const thisWeek = cb?.weeks.filter((w) => w.startsOn <= today).at(-1);
  const isAdmin = club.myRole === 'owner' || club.myRole === 'admin';

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div>
        {club.description && (
          <div className="mb-10 max-w-2xl text-lg">
            <Markdown text={club.description} />
          </div>
        )}
        <Section title="Reading now" action={isAdmin && <Link href={`/clubs/${club.slug}/settings#book`} className="link text-sm">{cb ? 'Change book' : 'Pick a book'}</Link>}>
          {cb ? (
            <div className="flex flex-col gap-6 sm:flex-row">
              <Link href={`/books/${cb.book.id}`}><BookCover book={cb.book} size="lg" /></Link>
              <div className="flex-1">
                <Link href={`/books/${cb.book.id}`} className="h2 hover:underline">{cb.book.title}</Link>
                <div className="text-muted">{cb.book.authors.join(', ')}</div>
                <div className="mt-2 text-sm text-muted">
                  {formatDate(cb.startsOn)} – {cb.endsOn ? formatDate(cb.endsOn) : 'ongoing'}
                  {cb.chaptersPerWeek && ` · ${cb.chaptersPerWeek} chapters a week`}
                </div>
                {thisWeek && (
                  <div className="mt-4 rounded-r-xl border-l-4 border-ochre-300 bg-ochre-50 py-2 pl-3 pr-4">
                    <div className="eyebrow">This week</div>
                    <div className="font-serif text-lg">Chapters {thisWeek.fromChapter}–{thisWeek.toChapter}</div>
                  </div>
                )}
                {cb.weeks.length > 0 && (
                  <details className="mt-4 text-sm">
                    <summary className="cursor-pointer">Full schedule</summary>
                    <ol className="mt-2 divide-y divide-line border-y border-line">
                      {cb.weeks.map((w) => (
                        <li key={w.week} className={`flex justify-between py-1.5 ${w === thisWeek ? 'font-medium' : 'text-muted'}`}>
                          <span>Week {w.week}: chapters {w.fromChapter}–{w.toChapter}</span>
                          <span>{formatDate(w.startsOn)}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
                {club.myRole && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href={`/clubs/${club.slug}/discussion`} className="btn">Go to discussion</Link>
                    <Link href={`/books/${cb.book.id}`} className="btn-ghost">Update my progress</Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Empty title="No book picked yet">{isAdmin ? 'Pick a book and a weekly schedule in Manage.' : 'The organizers are choosing the next book.'}</Empty>
          )}
        </Section>
        {club.history.filter((h) => !h.isCurrent).length > 0 && (
          <Section title="Past reads">
            <div className="flex flex-wrap gap-4">
              {club.history.filter((h) => !h.isCurrent).map((h) => (
                <Link key={h.id} href={`/books/${h.book.id}`} title={h.book.title}><BookCover book={h.book} /></Link>
              ))}
            </div>
          </Section>
        )}
      </div>
      <aside>
        <Section title="Meetups" action={isAdmin && <Link href={`/events/new?clubId=${club.id}`} className="link text-sm">New event</Link>}>
          {events.items.length ? events.items.map((e) => <EventCard key={e.id} event={e} />) : <p className="text-sm text-muted">No upcoming meetups.</p>}
        </Section>
      </aside>
    </div>
  );
}
