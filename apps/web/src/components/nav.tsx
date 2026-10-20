import type { Me } from '@bnw/shared';
import Link from 'next/link';
import { Logo } from './logo';
import { LiveBadges, NavLinks, UserMenu } from './nav-client';
import { Avatar } from './ui';

export function Nav({ me }: { me: Me | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-page items-center gap-8 px-4">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <NavLinks className="hidden md:flex" />
        <div className="ml-auto flex items-center gap-4">
          {me ? (
            <>
              <LiveBadges initialNotifications={me.unreadNotifications} initialMessages={me.unreadMessages} />
              <UserMenu isAdmin={me.isAdmin}>
                <Avatar user={me} size={34} />
              </UserMenu>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-muted transition hover:text-ink sm:inline">
                Sign in
              </Link>
              <Link href="/login" className="btn btn-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
      <NavLinks className="flex overflow-x-auto border-t border-line/80 px-4 md:hidden" mobile />
    </header>
  );
}
