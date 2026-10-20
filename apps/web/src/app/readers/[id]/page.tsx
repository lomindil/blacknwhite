import type { PublicProfile } from '@bnw/shared';
import Link from 'next/link';
import { ActionButton, ReportButton } from '@/components/actions';
import { Avatar, ClubCard, Section } from '@/components/ui';
import { cityName, formatDate } from '@/lib/format';
import { apiOrNotFound, getMe } from '@/lib/server-api';

export const metadata = { title: 'Reader', robots: { index: false } };

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  const p = await apiOrNotFound<PublicProfile>(`/v1/users/${id}`);
  const self = me?.id === p.id;

  return (
    <div className="max-w-4xl">
      <header className="mb-10 flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-center">
        <Avatar user={p} size={88} />
        <div className="flex-1">
          <h1 className="h1">{p.displayName}</h1>
          <div className="mt-1 text-sm text-muted">{[p.city && cityName(p.city), `joined ${formatDate(p.joinedAt)}`].filter(Boolean).join(' · ')}</div>
          {p.bio && <p className="mt-3 max-w-xl">{p.bio}</p>}
        </div>
        <div className="flex flex-col items-start gap-2">
          {self ? (
            <Link href="/settings" className="btn-ghost">Edit profile</Link>
          ) : me ? (
            <>
              {p.canMessage && <Link href={`/messages/new?to=${p.id}`} className="btn">Message</Link>}
              {p.blockedByMe ? (
                <ActionButton path={`/v1/blocks/${p.id}`} method="DELETE" className="btn-ghost btn-sm">Unblock</ActionButton>
              ) : (
                <ActionButton path="/v1/blocks" body={{ userId: p.id }} className="btn-ghost btn-sm" confirm={`Block ${p.displayName}? They won't be able to message you and you won't see their posts.`}>
                  Block
                </ActionButton>
              )}
              <ReportButton targetType="user" targetId={p.id} />
            </>
          ) : null}
        </div>
      </header>
      {p.sharedClubs.length > 0 && !self && (
        <Section title="Clubs you share">
          <div className="grid gap-4 sm:grid-cols-2">{p.sharedClubs.map((c) => <ClubCard key={c.id} club={c} />)}</div>
        </Section>
      )}
      <Section title="Public clubs">
        {p.clubs.length ? (
          <div className="grid gap-4 sm:grid-cols-2">{p.clubs.map((c) => <ClubCard key={c.id} club={c} />)}</div>
        ) : (
          <p className="text-sm text-muted">Not in any public clubs.</p>
        )}
      </Section>
    </div>
  );
}
