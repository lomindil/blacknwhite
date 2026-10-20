import type { BookstoreSummary, ClubRole, ClubSummary } from '@bnw/shared';
import Link from 'next/link';
import { Empty, PageHeader } from '@/components/ui';
import { api, requireMe } from '@/lib/server-api';
import { EventForm } from './event-form';

export const metadata = { title: 'Host an event' };

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ clubId?: string; bookstoreId?: string }> }) {
  const sp = await searchParams;
  await requireMe('/events/new');
  const [clubs, stores] = await Promise.all([
    api<(ClubSummary & { myRole: ClubRole })[]>('/v1/me/clubs'),
    api<BookstoreSummary[]>('/v1/me/bookstores'),
  ]);
  const hostable = clubs.filter((c) => c.myRole !== 'member');

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Events" title="Host an event">
        Members get a notification and email. Everyone who RSVPs gets reminders 24 hours and 2 hours before.
      </PageHeader>
      {hostable.length || stores.length ? (
        <EventForm
          hosts={[
            ...hostable.map((c) => ({ kind: 'club' as const, id: c.id, name: c.name, city: c.city })),
            ...stores.map((s) => ({ kind: 'bookstore' as const, id: s.id, name: s.name, city: s.city })),
          ]}
          defaultHost={sp.clubId ?? sp.bookstoreId}
        />
      ) : (
        <Empty title="Events are hosted by clubs or bookstores">
          <Link href="/clubs/new" className="link">Start a club</Link> to host meetups. Club admins and bookstore owners can post events.
        </Empty>
      )}
    </div>
  );
}
