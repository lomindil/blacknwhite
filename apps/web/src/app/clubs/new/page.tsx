import { PageHeader } from '@/components/ui';
import { requireMe } from '@/lib/server-api';
import { ClubForm } from '../club-form';

export const metadata = { title: 'Start a club' };

export default async function NewClubPage() {
  const me = await requireMe('/clubs/new');
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Organizers" title="Start a club">
        Set up your club, pick a book with a reading schedule, and invite members. You can move your WhatsApp group over gradually —
        reminders still reach them on WhatsApp.
      </PageHeader>
      <ClubForm initial={{ name: '', description: '', city: me.city, language: me.languages[0] ?? 'en', visibility: 'public' }} />
    </div>
  );
}
