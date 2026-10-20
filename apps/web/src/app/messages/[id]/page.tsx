import type { DmMessageItem, Page, UserSummary } from '@bnw/shared';
import Link from 'next/link';
import { ReportButton } from '@/components/actions';
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-4">
        <Link href="/messages" className="text-sm text-muted hover:text-ink">← Messages</Link>
        <Link href={`/readers/${conv.other.id}`} className="flex items-center gap-2 hover:underline">
          <Avatar user={conv.other} size={32} />
          <span className="font-medium">{conv.other.displayName}</span>
        </Link>
        <ReportButton targetType="user" targetId={conv.other.id} label="Report" />
      </div>
      <Chat conversationId={id} meId={me.id} initial={messages} readOnly={conv.readOnly} />
    </div>
  );
}
