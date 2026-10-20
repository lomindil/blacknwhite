'use client';

import type { DmMessageItem, Page } from '@bnw/shared';
import { useEffect, useRef, useState } from 'react';
import { FormError, ReportButton } from '@/components/actions';
import { call, errorMessage } from '@/lib/client-api';
import { timeAgo } from '@/lib/format';
import { getSocket, useRoom } from '@/lib/socket';

export function Chat({ conversationId, meId, initial, readOnly }: { conversationId: string; meId: string; initial: Page<DmMessageItem>; readOnly: boolean }) {
  const [messages, setMessages] = useState(initial.items);
  const [older, setOlder] = useState(initial.nextCursor);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastTyping = useRef(0);
  const room = `dm:${conversationId}`;

  useRoom(room, {
    'dm:message': (m: DmMessageItem) => {
      if (m.conversationId !== conversationId) return;
      setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
      if (m.senderId !== meId) void call(`/v1/dms/${conversationId}/read`, { method: 'POST' }).catch(() => undefined);
    },
    typing: (d: { userId: string }) => {
      if (d.userId === meId) return;
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3000);
    },
  });

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <div>
      {older && (
        <button
          type="button"
          className="mb-4 w-full text-center text-xs text-muted hover:underline"
          onClick={async () => {
            const page = await call<Page<DmMessageItem>>(`/v1/dms/${conversationId}/messages?limit=50&before=${older}`);
            setMessages((ms) => [...page.items, ...ms]);
            setOlder(page.nextCursor);
          }}
        >
          Load earlier messages
        </button>
      )}
      <ol className="flex min-h-[40vh] flex-col gap-3">
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <li key={m.id} className={`group flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] whitespace-pre-wrap break-words px-3 py-2 text-[15px] ${mine ? 'rounded-2xl rounded-br-md bg-sage-700 text-white' : 'rounded-2xl rounded-bl-md border border-line bg-surface'}`}>{m.body}</div>
              <div className="mt-0.5 flex gap-3 text-[11px] text-muted">
                <span>{timeAgo(m.createdAt)}</span>
                {!mine && <ReportButton targetType="dm_message" targetId={m.id} />}
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={bottom} className="h-6 pt-1 text-xs text-muted">{typing && 'Typing…'}</div>
      {readOnly ? (
        <p className="border border-line bg-soft p-3 text-sm text-muted">
          This conversation is read-only because you no longer share a club, or one of you has blocked the other.
        </p>
      ) : (
        <form
          className="flex gap-2 border-t border-line pt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!body.trim()) return;
            setError(null);
            try {
              const m = await call<DmMessageItem>(`/v1/dms/${conversationId}/messages`, { body: { body } });
              setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
              setBody('');
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <textarea
            className="input flex-1"
            rows={2}
            value={body}
            placeholder="Write a message"
            aria-label="Message"
            onChange={(e) => {
              setBody(e.target.value);
              if (Date.now() - lastTyping.current > 2000) {
                lastTyping.current = Date.now();
                getSocket().emit('typing', { room });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button className="btn self-end">Send</button>
        </form>
      )}
      <FormError error={error} />
    </div>
  );
}
