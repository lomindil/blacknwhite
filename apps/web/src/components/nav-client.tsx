'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { call } from '@/lib/client-api';
import { getSocket } from '@/lib/socket';

const LINKS = [
  { href: '/clubs', label: 'Clubs' },
  { href: '/books', label: 'Books' },
  { href: '/events', label: 'Events' },
  { href: '/bookstores', label: 'Bookstores' },
  { href: '/cities', label: 'Cities' },
];

/** Main navigation with an animated underline on the current section. */
export function NavLinks({ className = '', mobile = false }: { className?: string; mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={`items-center gap-6 text-sm ${className}`} aria-label={mobile ? 'Main mobile' : 'Main'}>
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`group relative shrink-0 py-2.5 transition ${active ? 'font-medium text-ink' : 'text-muted hover:text-ink'}`}
          >
            {l.label}
            <span
              className={`absolute inset-x-0 -bottom-px h-0.5 origin-left rounded-full bg-sage-600 transition-transform duration-300 ${active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
              aria-hidden
            />
          </Link>
        );
      })}
    </nav>
  );
}

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="absolute -right-3 -top-1.5 min-w-[18px] animate-pop-in rounded-full bg-clay-600 px-1.5 text-center text-[10px] font-semibold leading-[18px] text-white">
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

  const item = 'block px-4 py-2 text-sm transition hover:bg-sage-50 hover:text-sage-700';
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu" className="flex rounded-full ring-2 ring-transparent transition hover:ring-sage-200">
        {children}
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-56 origin-top-right animate-pop-in overflow-hidden rounded-2xl border border-line bg-surface py-1.5 shadow-lift">
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
