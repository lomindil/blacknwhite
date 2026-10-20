import type { DmConversationItem } from '@bnw/shared';
import { api, requireMe } from '@/lib/server-api';
import { ConversationList, MessagesShell } from './shell';

/** Two-pane inbox: conversations on the left, the open conversation on the right. */
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe('/messages');
  const convs = await api<DmConversationItem[]>('/v1/dms');
  return (
    <div className="-mt-2 sm:-mt-4">
      <MessagesShell list={<ConversationList convs={convs} meId={me.id} />}>{children}</MessagesShell>
    </div>
  );
}
