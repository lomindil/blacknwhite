import type { DmMessageItem, Page, UserSummary } from '@bnw/shared';
import Link from 'next/link';
import { ReportButton } from '@/components/actions';
import { IconChevron } from '@/components/icons';
import { Avatar } from '@/components/ui';
import { apiOrNotFound, requireMe } from '@/lib/server-api';
import { Chat } from './chat';

export const metadata = { title: 'Conversation' };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireMe(`/messages/${id}`);
  const conv = await apiOrNotFound<{ id: string; other: UserSummary; readOnly: boolean }>(`/v1/dms/${id}`);
  const messages = await apiOrNotFound<Page<DmMessageItem>>(`/v1/dms/${id}/messages?limit=50`);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-5">
        <Link href="/messages" className="-ml-1 rounded-full p-1.5 text-muted hover:bg-soft lg:hidden" aria-label="Back to messages">
          <IconChevron dir="left" size={20} />
        </Link>
        <Link href={`/readers/${conv.other.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar user={conv.other} size={38} />
          <span className="min-w-0">
            <span className="block truncate font-medium hover:underline">{conv.other.displayName}</span>
            <span className="block text-xs text-muted">{conv.readOnly ? 'Read-only conversation' : 'Shares a club with you'}</span>
          </span>
        </Link>
        <ReportButton targetType="user" targetId={conv.other.id} label="Report" />
      </div>
      <Chat conversationId={id} meId={me.id} initial={messages} readOnly={conv.readOnly} />
    </div>
  );
}
