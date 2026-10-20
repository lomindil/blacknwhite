'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Site header, footer and page container — everywhere except the admin portal, which has its own shell. */
export function SiteChrome({ nav, footer, children }: { nav: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/ops' || pathname.startsWith('/ops/')) return <>{children}</>;
  return (
    <>
      {nav}
      <main id="main" className="mx-auto w-full max-w-page flex-1 px-4 py-8 sm:py-12">
        {children}
      </main>
      {footer}
    </>
  );
}
