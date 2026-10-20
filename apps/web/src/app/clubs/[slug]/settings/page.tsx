import type { BookDetail, ClubDetail, InviteInfo } from '@bnw/shared';
import { redirect } from 'next/navigation';
import { ActionButton } from '@/components/actions';
import { Section } from '@/components/ui';
import { api, apiOrNotFound, requireMe } from '@/lib/server-api';
import { ClubForm } from '../../club-form';
import { Invites, ScheduleEditor, SetBookForm } from './manage-client';

export const metadata = { title: 'Manage club' };

export default async function ManageClubPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ created?: string; book?: string }> }) {
  const { slug } = await params;
  const { created, book: preselect } = await searchParams;
  await requireMe(`/clubs/${slug}/settings`);
  const club = await apiOrNotFound<ClubDetail>(`/v1/clubs/${slug}`);
  if (club.myRole !== 'owner' && club.myRole !== 'admin') redirect(`/clubs/${slug}`);
  const [invites, preselected] = await Promise.all([
    api<InviteInfo[]>(`/v1/clubs/${club.id}/invites`),
    preselect ? api<BookDetail>(`/v1/books/${preselect}`).catch(() => null) : null,
  ]);
  const cb = club.currentClubBook;

  return (
    <div className="max-w-3xl">
      {created && (
        <div className="mb-8 animate-pop-in rounded-2xl border border-sage-200 bg-sage-50 p-5">
          <div className="h3">Your club is ready.</div>
          <p className="mt-1 text-sm text-muted">Next: pick a book and a weekly schedule, then share an invite link in your WhatsApp group.</p>
        </div>
      )}

      <div id="book">
        <Section title={cb ? 'Change the current book' : 'Pick a book'}>
          <SetBookForm clubId={club.id} preselected={preselected} />
        </Section>
      </div>

      {cb && (
        <Section title={`Schedule for ${cb.book.title}`}>
          <ScheduleEditor clubId={club.id} clubBook={cb} />
        </Section>
      )}

      <Section title="Invite members">
        <Invites clubId={club.id} initial={invites} />
      </Section>

      <Section title="Club details">
        <ClubForm
          clubId={club.id}
          initial={{ name: club.name, description: club.description ?? '', city: club.city, language: club.language, visibility: club.visibility }}
        />
      </Section>

      {club.myRole === 'owner' && (
        <Section title="Danger zone">
          <p className="mb-3 text-sm text-muted">Deleting the club removes it from listings and closes its discussions for everyone.</p>
          <ActionButton path={`/v1/clubs/${club.id}`} method="DELETE" className="btn-ghost btn-danger" confirm="Delete this club for everyone?" redirectTo="/clubs">
            Delete club
          </ActionButton>
        </Section>
      )}
    </div>
  );
}
