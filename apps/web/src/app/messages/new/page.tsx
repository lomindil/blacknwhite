import type { PublicProfile } from '@bnw/shared';
import Link from 'next/link';
import { Avatar } from '@/components/ui';
import { apiOrNotFound, requireMe } from '@/lib/server-api';
import { StartConversation } from './start';

export const metadata = { title: 'New message' };

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams;
  await requireMe(`/messages/new${to ? `?to=${to}` : ''}`);
  if (!to) return <p className="text-muted">Choose someone from a club's member list to message.</p>;
  const profile = await apiOrNotFound<PublicProfile>(`/v1/users/${to}`);
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/messages" className="text-sm text-muted hover:text-ink">← Messages</Link>
      <div className="my-6 flex items-center gap-3">
        <Avatar user={profile} size={44} />
        <div>
          <h1 className="h2">Message {profile.displayName}</h1>
          {profile.sharedClubs.length > 0 && <div className="text-sm text-muted">You're both in {profile.sharedClubs.map((c) => c.name).join(', ')}</div>}
        </div>
      </div>
      {profile.canMessage ? (
        <StartConversation recipientId={profile.id} />
      ) : (
        <p className="border border-line bg-soft p-4 text-sm">
          You can't message {profile.displayName}. Messages are only possible between people who share a club, and readers can turn off
          messages in their settings.
        </p>
      )}
    </div>
  );
}
