'use client';

import type { DmConversationItem } from '@bnw/shared';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Avatar } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { getSocket } from '@/lib/socket';

export function MessagesShell({ list, children }: { list: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const inConversation = pathname !== '/messages';
  return (
    <div className="grid h-[calc(100dvh-10rem)] min-h-[520px] overflow-hidden rounded-3xl border border-line bg-surface shadow-lift lg:grid-cols-[21rem_minmax(0,1fr)]">
      <div className={`min-h-0 border-line lg:block lg:border-r ${inConversation ? 'hidden' : 'block'}`}>{list}</div>
      <div className={`min-h-0 lg:block ${inConversation ? 'block' : 'hidden'}`}>{children}</div>
    </div>
  );
}

export function ConversationList({ convs, meId }: { convs: DmConversationItem[]; meId: string }) {
  const pathname = usePathname();
  const router = useRouter();

  // New messages anywhere refresh the list (unread dots, ordering).
  useEffect(() => {
    const s = getSocket();
    const on = () => router.refresh();
    s.on('dm:new', on);
    return () => {
      s.off('dm:new', on);
    };
  }, [router]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h1 className="font-serif text-2xl font-medium">Messages</h1>
        <span className="text-xs text-muted">{convs.length} conversation{convs.length === 1 ? '' : 's'}</span>
      </div>
      {convs.length ? (
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {convs.map((c) => {
            const active = pathname === `/messages/${c.id}`;
            return (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${active ? 'bg-sage-50 ring-1 ring-sage-200' : 'hover:bg-soft'}`}
                >
                  <Avatar user={c.other} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${c.unread ? 'font-semibold' : 'font-medium'}`}>{c.other.displayName}</span>
                      {c.lastMessage && <span className="shrink-0 text-[11px] text-muted">{timeAgo(c.lastMessage.createdAt)}</span>}
                    </div>
                    <div className={`truncate text-sm ${c.unread ? 'text-ink' : 'text-muted'}`}>
                      {c.readOnly ? <span className="italic">Read-only · </span> : null}
                      {c.lastMessage ? `${c.lastMessage.senderId === meId ? 'You: ' : ''}${c.lastMessage.body}` : ''}
                    </div>
                  </div>
                  {c.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-clay-600" aria-label="Unread" />}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="font-serif text-lg">No messages yet</div>
          <p className="mt-1 text-sm text-muted">Open a club's member list and tap Message to start a conversation.</p>
        </div>
      )}
      <p className="border-t border-line px-5 py-3 text-xs text-muted">You can message people who share a club with you.</p>
    </div>
  );
}
