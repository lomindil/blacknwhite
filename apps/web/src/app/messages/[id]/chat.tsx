'use client';

import type { DmMessageItem, Page } from '@bnw/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FormError, ReportButton } from '@/components/actions';
import { IconSend } from '@/components/icons';
import { call, errorMessage } from '@/lib/client-api';
import { getSocket, useRoom } from '@/lib/socket';

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export function Chat({ conversationId, meId, initial, readOnly }: { conversationId: string; meId: string; initial: Page<DmMessageItem>; readOnly: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial.items);
  const [older, setOlder] = useState(initial.nextCursor);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
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

  // Scroll inside the message pane only (never the page), and only when already at the bottom.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  let lastDay = '';
  return (
    <>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="relative min-h-0 flex-1 overflow-y-auto bg-soft px-4 py-5 sm:px-6"
      >
        <div className="dots pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative">
          {older && (
            <button
              type="button"
              className="mx-auto mb-4 block rounded-full border border-line bg-surface px-4 py-1.5 text-xs text-muted shadow-sm hover:text-ink"
              onClick={async () => {
                stick.current = false;
                const page = await call<Page<DmMessageItem>>(`/v1/dms/${conversationId}/messages?limit=50&before=${older}`);
                setMessages((ms) => [...page.items, ...ms]);
                setOlder(page.nextCursor);
              }}
            >
              Load earlier messages
            </button>
          )}
          {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">Say hello 👋</p>}
          <ol className="flex flex-col gap-1.5">
            {messages.map((m, i) => {
              const mine = m.senderId === meId;
              const day = dayLabel(m.createdAt);
              const showDay = day !== lastDay;
              lastDay = day;
              const nextSame = messages[i + 1]?.senderId === m.senderId && dayLabel(messages[i + 1].createdAt) === day;
              return (
                <li key={m.id} className="contents">
                  {showDay && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-full border border-line bg-surface px-3 py-0.5 text-[11px] font-medium text-muted shadow-sm">{day}</span>
                    </div>
                  )}
                  <div className={`group flex animate-fade-up flex-col ${mine ? 'items-end' : 'items-start'} ${nextSame ? '' : 'mb-2'}`}>
                    <div
                      className={`max-w-[78%] whitespace-pre-wrap break-words px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                        mine ? 'rounded-2xl rounded-br-md bg-sage-700 text-white' : 'rounded-2xl rounded-bl-md border border-line bg-surface text-ink'
                      }`}
                    >
                      {m.body}
                    </div>
                    {!nextSame && (
                      <div className="mt-1 flex gap-3 px-1 text-[11px] text-muted">
                        <span>{time(m.createdAt)}</span>
                        {!mine && <span className="opacity-0 transition group-hover:opacity-100"><ReportButton targetType="dm_message" targetId={m.id} /></span>}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {typing && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-surface px-3 py-2 shadow-sm" aria-label="Typing">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 150}ms` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {readOnly ? (
        <p className="border-t border-line bg-soft px-5 py-4 text-sm text-muted">
          This conversation is read-only because you no longer share a club, or one of you has blocked the other.
        </p>
      ) : (
        <form
          className="border-t border-line bg-surface p-3 sm:p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!body.trim()) return;
            setError(null);
            try {
              stick.current = true;
              const m = await call<DmMessageItem>(`/v1/dms/${conversationId}/messages`, { body: { body } });
              setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
              setBody('');
              router.refresh(); // update the conversation list preview
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-1.5 pl-4 shadow-sm transition focus-within:border-sage-600 focus-within:ring-4 focus-within:ring-sage-100">
            <textarea
              className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-muted/70"
              rows={1}
              value={body}
              placeholder="Write a message…"
              aria-label="Message"
              onChange={(e) => {
                setBody(e.target.value);
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
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
            <button className="btn h-10 w-10 shrink-0 p-0" aria-label="Send" disabled={!body.trim()}>
              <IconSend size={18} />
            </button>
          </div>
          <div className="mt-1.5 flex justify-between px-1 text-[11px] text-muted">
            <span>Enter to send · Shift+Enter for a new line</span>
          </div>
          <FormError error={error} />
        </form>
      )}
    </>
  );
}
