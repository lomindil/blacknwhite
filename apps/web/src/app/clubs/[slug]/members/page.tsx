import type { ClubDetail, ClubMemberInfo } from '@bnw/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ActionButton } from '@/components/actions';
import { Avatar } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { api, apiOrNotFound, requireMe } from '@/lib/server-api';
import { RoleSelect } from './role-select';

export const metadata = { title: 'Members' };

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await requireMe(`/clubs/${slug}/members`);
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  if (!club.myRole) redirect(`/clubs/${slug}`);
  const members = await api<ClubMemberInfo[]>(`/v1/clubs/${club.id}/members`);

  return (
    <div className="max-w-3xl">
      <ul className="divide-y divide-line border-y border-line">
        {members.map((m) => {
          const self = m.user.id === me.id;
          const canRemove = !self && m.role !== 'owner' && (club.myRole === 'owner' || (club.myRole === 'admin' && m.role === 'member'));
          return (
            <li key={m.user.id} className="flex flex-wrap items-center gap-4 py-3">
              <Link href={`/readers/${m.user.id}`} className="flex flex-1 items-center gap-3 hover:underline">
                <Avatar user={m.user} size={36} />
                <span>
                  <span className="block">{m.user.displayName}{self && ' (you)'}</span>
                  <span className="block text-xs text-muted">Joined {formatDate(m.joinedAt)}</span>
                </span>
              </Link>
              {club.myRole === 'owner' && !self ? (
                <RoleSelect clubId={club.id} userId={m.user.id} role={m.role} />
              ) : (
                <span className="chip capitalize">{m.role}</span>
              )}
              {!self && (
                <Link href={`/messages/new?to=${m.user.id}`} className="btn-ghost btn-sm">Message</Link>
              )}
              {canRemove && (
                <ActionButton path={`/v1/clubs/${club.id}/members/${m.user.id}`} method="DELETE" className="btn-ghost btn-sm btn-danger" confirm={`Remove ${m.user.displayName} from the club?`}>
                  Remove
                </ActionButton>
              )}
            </li>
          );
        })}
      </ul>
      {club.myRole && (
        <div className="mt-10 border-t border-line pt-6">
          <ActionButton
            path={`/v1/clubs/${club.id}/leave`}
            className="btn-ghost btn-danger"
            confirm={club.myRole === 'owner' && members.length === 1 ? 'You are the only member. Leaving will close the club. Continue?' : 'Leave this club?'}
            redirectTo="/clubs"
          >
            Leave club
          </ActionButton>
        </div>
      )}
    </div>
  );
}
