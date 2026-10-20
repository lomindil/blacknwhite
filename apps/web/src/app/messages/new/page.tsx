import type { PublicProfile } from '@bnw/shared';
import Link from 'next/link';
import { IconChevron } from '@/components/icons';
import { Avatar } from '@/components/ui';
import { apiOrNotFound, requireMe } from '@/lib/server-api';
import { StartConversation } from './start';

export const metadata = { title: 'New message' };

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams;
  await requireMe(`/messages/new${to ? `?to=${to}` : ''}`);
  if (!to) return <p className="p-8 text-muted">Choose someone from a club's member list to message.</p>;
  const profile = await apiOrNotFound<PublicProfile>(`/v1/users/${to}`);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <Link href="/messages" className="-ml-1 rounded-full p-1.5 text-muted hover:bg-soft lg:hidden" aria-label="Back to messages">
          <IconChevron dir="left" size={20} />
        </Link>
        <Avatar user={profile} size={38} />
        <div className="min-w-0">
          <div className="truncate font-medium">New message to {profile.displayName}</div>
          {profile.sharedClubs.length > 0 && <div className="truncate text-xs text-muted">You're both in {profile.sharedClubs.map((c) => c.name).join(', ')}</div>}
        </div>
      </div>
      <div className="relative flex flex-1 flex-col justify-end bg-soft p-4 sm:p-6">
        <div className="dots pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative">
          {profile.canMessage ? (
            <StartConversation recipientId={profile.id} />
          ) : (
            <p className="rounded-2xl border border-line bg-surface p-4 text-sm">
              You can't message {profile.displayName}. Messages are only possible between people who share a club, and readers can turn off messages in their settings.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
