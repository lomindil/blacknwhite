import type { ClubDetail } from '@bnw/shared';
import type { Metadata } from 'next';
import { ActionButton, ReportButton } from '@/components/actions';
import { cityName, languageName, plural } from '@/lib/format';
import { api, apiOrNotFound, getMe } from '@/lib/server-api';
import { ClubTabs } from './tabs';

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

export default async function ClubLayout({ params, children }: Props) {
  const { slug } = await params;
  const me = await getMe();
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  const isAdmin = club.myRole === 'owner' || club.myRole === 'admin';

  return (
    <div>
      <header className="mb-6 border-b border-line pb-6">
        <div className="eyebrow mb-2">
          {[club.city && cityName(club.city), languageName(club.language), club.visibility === 'private' ? 'Private club' : 'Public club'].filter(Boolean).join(' · ')}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="h1">{club.name}</h1>
            <div className="mt-2 text-sm text-muted">
              {plural(club.memberCount, 'member')} · organized by {club.owner.displayName}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!me ? (
              <a href={`/login?next=/clubs/${club.slug}`} className="btn">Sign in to join</a>
            ) : club.myRole ? (
              <span className="chip">{club.myRole === 'member' ? 'Member' : club.myRole === 'owner' ? 'Owner' : 'Admin'}</span>
            ) : club.visibility === 'public' ? (
              <ActionButton path={`/v1/clubs/${club.id}/join`}>Join club</ActionButton>
            ) : (
              <span className="text-sm text-muted">Invite-only — ask an organizer for a link</span>
            )}
            {me && !isAdmin && <ReportButton targetType="club" targetId={club.id} />}
          </div>
        </div>
      </header>
      {club.myRole && <ClubTabs slug={club.slug} isAdmin={isAdmin} />}
      {children}
    </div>
  );
}
