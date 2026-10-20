import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { LogoMark } from './logo';

const COLUMNS = [
  {
    title: 'Discover',
    links: [
      { href: '/clubs', label: 'Book clubs' },
      { href: '/events', label: 'Events & meetups' },
      { href: '/books', label: 'Books' },
      { href: '/bookstores', label: 'Bookstores' },
      { href: '/cities', label: 'Cities' },
      { href: '/blog', label: 'Blog' },
    ],
  },
  {
    title: 'Organize',
    links: [
      { href: '/clubs/new', label: 'Start a club' },
      { href: '/events/new', label: 'Host a meetup' },
      { href: '/me/import', label: 'Import from Goodreads' },
      { href: '/blog/new', label: 'Write for the blog' },
    ],
  },
  {
    title: 'About',
    links: [
      { href: '/about', label: 'About us' },
      { href: '/terms', label: 'Terms of use' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms#grievance', label: 'Grievance officer' },
    ],
  },
];

/** One footer for every page: same structure and height everywhere. */
export function Footer() {
  return (
    <footer className="border-t border-line bg-sand">
      <div className="mx-auto grid max-w-page gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-serif text-lg font-medium">{BRAND.name}</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{BRAND.tagline} Book clubs, meetups and readers across India.</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink">{col.title}</div>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted transition hover:text-sage-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line/80">
        <div className="mx-auto flex max-w-page flex-col gap-1 px-4 py-4 text-xs text-muted sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {BRAND.name} · Made in India for readers everywhere</span>
          <span>Some book links are affiliate links.</span>
        </div>
      </div>
    </footer>
  );
}
