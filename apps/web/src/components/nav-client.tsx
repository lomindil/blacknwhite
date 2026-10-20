'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { call } from '@/lib/client-api';
import { getSocket } from '@/lib/socket';

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="absolute -right-2 -top-1.5 min-w-[16px] rounded-full bg-ink px-1 text-center text-[10px] leading-4 text-paper">
      {n > 99 ? '99+' : n}
    </span>
  );
}

/** Notification and message counts, kept live over the WebSocket. */
export function LiveBadges({ initialNotifications, initialMessages }: { initialNotifications: number; initialMessages: number }) {
  const [notes, setNotes] = useState(initialNotifications);
  const [msgs, setMsgs] = useState(initialMessages);
  const pathname = usePathname();

  useEffect(() => setNotes(initialNotifications), [initialNotifications]);
  useEffect(() => setMsgs(initialMessages), [initialMessages]);

  useEffect(() => {
    const s = getSocket();
    const onNote = () => setNotes((n) => n + 1);
    const onDm = () => {
      if (!window.location.pathname.startsWith('/messages')) setMsgs((n) => n + 1);
    };
    s.on('notification', onNote);
    s.on('dm:new', onDm);
    return () => {
      s.off('notification', onNote);
      s.off('dm:new', onDm);
    };
  }, []);

  useEffect(() => {
    if (pathname === '/notifications') setNotes(0);
  }, [pathname]);

  return (
    <div className="flex items-center gap-5 text-sm">
      <Link href="/messages" className="relative text-muted hover:text-ink" aria-label={`Messages${msgs ? `, ${msgs} unread` : ''}`}>
        Messages
        <Badge n={msgs} />
      </Link>
      <Link href="/notifications" className="relative text-muted hover:text-ink" aria-label={`Notifications${notes ? `, ${notes} unread` : ''}`}>
        Activity
        <Badge n={notes} />
      </Link>
    </div>
  );
}

export function UserMenu({ children, isAdmin }: { children: ReactNode; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const item = 'block px-4 py-2 text-sm hover:bg-soft';
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu" className="flex">
        {children}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 border border-line bg-paper py-1 shadow-sm">
          <Link href="/" className={item}>Home</Link>
          <Link href="/me/books" className={item}>My shelves</Link>
          <Link href="/clubs/new" className={item}>Start a club</Link>
          <Link href="/me/import" className={item}>Import from Goodreads</Link>
          <Link href="/settings" className={item}>Settings</Link>
          {isAdmin && <Link href="/admin" className={item}>Moderation</Link>}
          <button
            type="button"
            className={`${item} w-full border-t border-line text-left`}
            onClick={async () => {
              await call('/auth/logout', { method: 'POST' }).catch(() => undefined);
              router.push('/');
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
