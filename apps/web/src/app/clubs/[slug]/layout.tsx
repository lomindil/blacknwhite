import type { ClubDetail } from '@bnw/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton, ReportButton } from '@/components/actions';
import { IconCalendar, IconLink } from '@/components/icons';
import { BookCover } from '@/components/ui';
import { cityName, languageName, plural } from '@/lib/format';
import { api, apiOrNotFound, getMe } from '@/lib/server-api';
import { ClubNav } from './tabs';

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const club = await api<ClubDetail>(`/v1/clubs/${slug}`).catch(() => null);
  if (!club) return {};
  return {
    title: club.name,
    description: club.description?.slice(0, 160) ?? `A book club${club.city ? ` in ${cityName(club.city)}` : ''}.`,
    robots: club.visibility === 'private' ? { index: false } : undefined,
  };
}

/** Club shell: a sticky side panel (identity, current book, sections, actions) and the section content. */
export default async function ClubLayout({ params, children }: Props) {
  const { slug } = await params;
  const me = await getMe();
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  const isAdmin = club.myRole === 'owner' || club.myRole === 'admin';
  const cb = club.currentClubBook;
  const today = new Date().toISOString().slice(0, 10);
  const thisWeek = cb?.weeks.filter((w) => w.startsOn <= today).at(-1);
  const progress = cb && cb.weeks.length ? Math.round(((thisWeek?.week ?? 0) / cb.weeks.length) * 100) : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden p-0">
          {/* identity */}
          <div className="relative bg-gradient-to-br from-sage-100 via-sage-50 to-surface px-5 pb-5 pt-6">
            <div className="dots absolute inset-0 opacity-60" aria-hidden />
            <div className="relative">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <span className={`chip ${club.visibility === 'private' ? 'border-plum-200 bg-plum-50 text-plum-700' : 'border-sage-200 bg-white/70 text-sage-700'}`}>
                  {club.visibility === 'private' ? 'Private club' : 'Public club'}
                </span>
                {club.myRole && club.myRole !== 'member' && <span className="chip border-ochre-200 bg-ochre-50 capitalize text-ochre-700">{club.myRole}</span>}
              </div>
              <h1 className="font-serif text-2xl font-medium leading-tight">{club.name}</h1>
              <div className="mt-1.5 text-sm text-muted">
                {[club.city && cityName(club.city), languageName(club.language), plural(club.memberCount, 'member')].filter(Boolean).join(' · ')}
              </div>
              <div className="mt-1 text-xs text-muted">Organized by {club.owner.displayName}</div>
            </div>
          </div>

          {/* current book */}
          {cb && (
            <Link href={`/books/${cb.book.id}`} className="group flex items-center gap-3 border-t border-line/70 px-5 py-4 transition hover:bg-sage-50/60">
              <BookCover book={cb.book} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">Reading now</div>
                <div className="truncate font-serif group-hover:underline">{cb.book.title}</div>
                {thisWeek && <div className="text-xs text-muted">Week {thisWeek.week} · ch. {thisWeek.fromChapter}–{thisWeek.toChapter}</div>}
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sky-50">
                  <div className="h-full rounded-full bg-sky-600" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </Link>
          )}

          {/* membership */}
          {!club.myRole && (
            <div className="border-t border-line/70 px-5 py-4">
              {!me ? (
                <Link href={`/login?next=/clubs/${club.slug}`} className="btn w-full">Sign in to join</Link>
              ) : club.visibility === 'public' ? (
                <ActionButton path={`/v1/clubs/${club.id}/join`} className="btn w-full">Join club</ActionButton>
              ) : (
                <p className="text-sm text-muted">Invite-only — ask an organizer for a link.</p>
              )}
            </div>
          )}

          {/* sections */}
          {club.myRole && (
            <div className="border-t border-line/70 p-2">
              <ClubNav slug={club.slug} isAdmin={isAdmin} />
            </div>
          )}

          {/* quick actions */}
          {isAdmin && (
            <div className="hidden gap-2 border-t border-line/70 p-4 lg:grid">
              <Link href={`/events/new?clubId=${club.id}`} className="btn-ghost btn-sm justify-start">
                <IconCalendar size={15} /> Schedule a meetup
              </Link>
              <Link href={`/clubs/${club.slug}/settings#invites`} className="btn-ghost btn-sm justify-start">
                <IconLink size={15} /> Invite members
              </Link>
            </div>
          )}
        </div>
        {me && !isAdmin && (
          <div className="mt-3 px-2">
            <ReportButton targetType="club" targetId={club.id} label="Report this club" />
          </div>
        )}
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
