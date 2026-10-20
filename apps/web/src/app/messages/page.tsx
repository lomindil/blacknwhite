import type { DmConversationItem } from '@bnw/shared';
import Link from 'next/link';
import { Avatar, Empty, PageHeader } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { api, requireMe } from '@/lib/server-api';

export const metadata = { title: 'Messages' };

export default async function MessagesPage() {
  const me = await requireMe('/messages');
  const convs = await api<DmConversationItem[]>('/v1/dms');
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Inbox" title="Messages">
        You can message people who share a club with you.
      </PageHeader>
      {convs.length ? (
        <ul className="divide-y divide-line border-y border-line">
          {convs.map((c) => (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="flex items-center gap-4 py-3 hover:bg-soft">
                <Avatar user={c.other} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={c.unread ? 'font-semibold' : ''}>{c.other.displayName}</span>
                    {c.lastMessage && <span className="shrink-0 text-xs text-muted">{timeAgo(c.lastMessage.createdAt)}</span>}
                  </div>
                  <div className={`truncate text-sm ${c.unread ? 'text-ink' : 'text-muted'}`}>
                    {c.lastMessage ? `${c.lastMessage.senderId === me.id ? 'You: ' : ''}${c.lastMessage.body}` : ''}
                  </div>
                </div>
                {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-ink" aria-label="Unread" />}
                {c.readOnly && <span className="chip">Read-only</span>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No messages yet">Open a club's member list and tap Message to start a conversation.</Empty>
      )}
    </div>
  );
}
