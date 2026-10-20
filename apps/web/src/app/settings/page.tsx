import { Section } from '@/components/ui';
import { api, requireMe } from '@/lib/server-api';
import { AccountActions, NotificationSettings, ProfileSettings } from './settings-client';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const me = await requireMe('/settings');
  const blocks = await api<{ id: string; displayName: string; blockedAt: string }[]>('/v1/me/blocks');
  return (
    <div className="max-w-2xl">
      <h1 className="h1 mb-10">Settings</h1>
      <Section title="Profile">
        <ProfileSettings me={me} />
      </Section>
      <div id="notifications">
        <Section title="Notifications and privacy">
          <NotificationSettings me={me} />
        </Section>
      </div>
      <Section title="Your account">
        <AccountActions email={me.email} blocks={blocks} />
      </Section>
    </div>
  );
}
