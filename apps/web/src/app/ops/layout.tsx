import type { Metadata } from 'next';
import { api } from '@/lib/server-api';
import { OpsLogin, OpsShell } from './shell';

export const metadata: Metadata = { title: { default: 'Admin portal', template: '%s · Admin portal' }, robots: { index: false, follow: false } };

/** Unlisted admin portal. No portal session → sign-in screen; nothing here is linked from the site. */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const me = await api<{ email: string; usingDefaultPassword: boolean }>('/ops/me').catch(() => null);
  if (!me) return <OpsLogin />;
  return (
    <OpsShell email={me.email} defaultPassword={me.usingDefaultPassword}>
      {children}
    </OpsShell>
  );
}
