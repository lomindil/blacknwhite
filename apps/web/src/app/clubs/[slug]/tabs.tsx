'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { IconBook, IconChat, IconHome, IconSettings, IconUsers, IconVote } from '@/components/icons';

/** Club sections: a vertical list in the side panel on desktop, a scrollable pill row on mobile. */
export function ClubNav({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const base = `/clubs/${slug}`;
  const items: { href: string; label: string; icon: ReactNode; match?: (p: string) => boolean }[] = [
    { href: base, label: 'Overview', icon: <IconHome size={18} />, match: (p) => p === base },
    { href: `${base}/board`, label: 'Message board', icon: <IconChat size={18} /> },
    { href: `${base}/discussion`, label: 'Book discussion', icon: <IconBook size={18} />, match: (p) => p.startsWith(`${base}/discussion`) || p.startsWith(`${base}/threads/`) },
    { href: `${base}/polls`, label: 'Polls', icon: <IconVote size={18} /> },
    { href: `${base}/members`, label: 'Members', icon: <IconUsers size={18} /> },
    ...(isAdmin ? [{ href: `${base}/settings`, label: 'Manage', icon: <IconSettings size={18} /> }] : []),
  ];

  return (
    <nav aria-label="Club sections" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map((it) => {
        const active = it.match ? it.match(pathname) : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              active ? 'bg-sage-50 font-medium text-sage-800' : 'text-muted hover:bg-soft hover:text-ink'
            }`}
          >
            <span className={`absolute inset-y-2 left-0 hidden w-[3px] rounded-full bg-sage-600 transition-opacity lg:block ${active ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
            <span className={active ? 'text-sage-700' : 'text-muted group-hover:text-ink'}>{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Heading for a club section, aligned with the side panel. */
export function ClubSectionHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex animate-fade-up flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-serif text-3xl font-medium tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
