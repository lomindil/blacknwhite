import type { ClubDetail, ClubMemberInfo } from '@bnw/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ActionButton } from '@/components/actions';
import { IconChat, IconLink } from '@/components/icons';
import { Avatar } from '@/components/ui';
import { formatDate, plural } from '@/lib/format';
import { api, apiOrNotFound, requireMe } from '@/lib/server-api';
import { ClubSectionHeader } from '../tabs';
import { RoleSelect } from './role-select';

export const metadata = { title: 'Members' };

const ROLE_CHIP: Record<string, string> = {
  owner: 'border-ochre-200 bg-ochre-50 text-ochre-700',
  admin: 'border-sky-200 bg-sky-50 text-sky-700',
  member: '',
};

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await requireMe(`/clubs/${slug}/members`);
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  if (!club.myRole) redirect(`/clubs/${slug}`);
  const members = await api<ClubMemberInfo[]>(`/v1/clubs/${club.id}/members`);
  const isAdmin = club.myRole !== 'member';

  return (
    <div>
      <ClubSectionHeader
        title="Members"
        subtitle={`${plural(members.length, 'reader')} in ${club.name}`}
        actions={
          isAdmin && (
            <Link href={`/clubs/${club.slug}/settings#invites`} className="btn btn-sm">
              <IconLink size={15} /> Invite members
            </Link>
          )
        }
      />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((m) => {
          const self = m.user.id === me.id;
          const canRemove = !self && m.role !== 'owner' && (club.myRole === 'owner' || (club.myRole === 'admin' && m.role === 'member'));
          return (
            <li key={m.user.id} className="card card-hover flex flex-col gap-4">
              <Link href={`/readers/${m.user.id}`} className="flex items-center gap-3">
                <Avatar user={m.user} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-medium hover:underline">{m.user.displayName}{self && ' (you)'}</span>
                  <span className="block text-xs text-muted">Joined {formatDate(m.joinedAt)}</span>
                </span>
              </Link>
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
                {club.myRole === 'owner' && !self ? (
                  <RoleSelect clubId={club.id} userId={m.user.id} role={m.role} />
                ) : (
                  <span className={`chip capitalize ${ROLE_CHIP[m.role]}`}>{m.role}</span>
                )}
                <span className="flex-1" />
                {!self && (
                  <Link href={`/messages/new?to=${m.user.id}`} className="btn-ghost btn-sm" aria-label={`Message ${m.user.displayName}`}>
                    <IconChat size={14} /> Message
                  </Link>
                )}
                {canRemove && (
                  <ActionButton path={`/v1/clubs/${club.id}/members/${m.user.id}`} method="DELETE" className="btn-ghost btn-sm btn-danger" confirm={`Remove ${m.user.displayName} from the club?`}>
                    Remove
                  </ActionButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-10 flex items-center justify-between gap-4 rounded-2xl border border-line/70 bg-surface px-5 py-4">
        <div className="text-sm text-muted">{club.myRole === 'owner' ? 'Hand over ownership before leaving if others remain.' : 'You can rejoin public clubs any time.'}</div>
        <ActionButton
          path={`/v1/clubs/${club.id}/leave`}
          className="btn-ghost btn-sm btn-danger"
          confirm={club.myRole === 'owner' && members.length === 1 ? 'You are the only member. Leaving will close the club. Continue?' : 'Leave this club?'}
          redirectTo="/clubs"
        >
          Leave club
        </ActionButton>
      </div>
    </div>
  );
}
