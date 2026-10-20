import type { Me } from '@bnw/shared';
import Link from 'next/link';
import { Avatar } from './ui';
import { LiveBadges, UserMenu } from './nav-client';

const links = [
  { href: '/clubs', label: 'Clubs' },
  { href: '/books', label: 'Books' },
  { href: '/events', label: 'Events' },
  { href: '/bookstores', label: 'Bookstores' },
  { href: '/cities', label: 'Cities' },
];

export function Nav({ me }: { me: Me | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-page items-center gap-6 px-4">
        <Link href="/" className="font-serif text-xl tracking-tight">
          black<span className="text-muted">&amp;</span>white
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          {me ? (
            <>
              <LiveBadges initialNotifications={me.unreadNotifications} initialMessages={me.unreadMessages} />
              <UserMenu isAdmin={me.isAdmin}>
                <Avatar user={me} size={30} />
              </UserMenu>
            </>
          ) : (
            <Link href="/login" className="btn btn-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-line px-4 py-2 text-sm md:hidden" aria-label="Main mobile">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="shrink-0 text-muted hover:text-ink">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
