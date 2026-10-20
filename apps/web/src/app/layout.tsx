import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { SiteChrome } from '@/components/chrome';
import { Footer } from '@/components/footer';
import { Nav } from '@/components/nav';
import { BRAND } from '@/lib/brand';
import { getMe } from '@/lib/server-api';
import './globals.css';

const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
};

export const viewport: Viewport = { themeColor: '#FAF8F3' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-card">
          Skip to content
        </a>
        <SiteChrome nav={<Nav me={me} />} footer={<Footer />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
