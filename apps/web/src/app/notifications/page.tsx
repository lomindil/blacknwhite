import type { NotificationItem, Page } from '@bnw/shared';
import Link from 'next/link';
import { Empty, PageHeader } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { api, requireMe } from '@/lib/server-api';
import { MarkAllRead } from './mark-read';

export const metadata = { title: 'Activity' };

export default async function NotificationsPage() {
  await requireMe('/notifications');
  const page = await api<Page<NotificationItem>>('/v1/notifications?limit=50');
  const unread = page.items.some((n) => !n.readAt);
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Inbox" title="Activity" actions={<Link href="/settings#notifications" className="btn-ghost btn-sm">Notification settings</Link>} />
      <MarkAllRead hasUnread={unread} />
      {page.items.length ? (
        <ul className="divide-y divide-line border-y border-line">
          {page.items.map((n) => {
            const inner = (
              <div className="flex gap-3 py-3">
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-ink'}`} aria-label={n.readAt ? undefined : 'Unread'} />
                <div className="min-w-0 flex-1">
                  <div className={n.readAt ? 'text-muted' : ''}>{n.payload.title}</div>
                  {n.payload.body && <div className="truncate text-sm text-muted">{n.payload.body}</div>}
                </div>
                <span className="shrink-0 text-xs text-muted">{timeAgo(n.createdAt)}</span>
              </div>
            );
            return <li key={n.id}>{n.payload.url ? <Link href={n.payload.url} className="block hover:bg-soft">{inner}</Link> : inner}</li>;
          })}
        </ul>
      ) : (
        <Empty title="All quiet">Replies, new books in your clubs, polls and event reminders show up here.</Empty>
      )}
    </div>
  );
}
