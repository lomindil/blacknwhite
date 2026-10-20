import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { getMe } from '@/lib/server-api';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'black&white — read together', template: '%s · black&white' },
  description: 'Run your book club, discuss without spoilers, and find readers, meetups and bookstores near you.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#10100f' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-paper focus:p-2">
          Skip to content
        </a>
        <Nav me={me} />
        <main id="main" className="mx-auto max-w-page px-4 py-8 sm:py-12">
          {children}
        </main>
        <footer className="mt-16 border-t border-line">
          <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted">
            <span className="font-serif text-ink">black&amp;white</span>
            <nav className="flex flex-wrap gap-5">
              <Link href="/cities" className="hover:text-ink">Cities</Link>
              <Link href="/terms" className="hover:text-ink">Terms</Link>
              <Link href="/privacy" className="hover:text-ink">Privacy</Link>
              <Link href="/terms#grievance" className="hover:text-ink">Grievance officer</Link>
            </nav>
            <span>Some book links are affiliate links.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
