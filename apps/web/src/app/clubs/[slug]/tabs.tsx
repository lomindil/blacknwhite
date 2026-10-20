'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ClubTabs({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const base = `/clubs/${slug}`;
  const tabs = [
    { href: base, label: 'Overview' },
    { href: `${base}/discussion`, label: 'Discussion' },
    { href: `${base}/polls`, label: 'Polls' },
    { href: `${base}/members`, label: 'Members' },
    ...(isAdmin ? [{ href: `${base}/settings`, label: 'Manage' }] : []),
  ];
  return (
    <nav className="mb-8 flex gap-6 overflow-x-auto border-b border-line text-sm" aria-label="Club sections">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname.startsWith(t.href) || (t.label === 'Discussion' && pathname.includes('/threads/'));
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px shrink-0 border-b-2 pb-2 ${active ? 'border-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
