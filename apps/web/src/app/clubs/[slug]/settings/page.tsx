import type { BookDetail, ClubDetail, InviteInfo } from '@bnw/shared';
import { redirect } from 'next/navigation';
import { ActionButton } from '@/components/actions';
import { api, apiOrNotFound, requireMe } from '@/lib/server-api';
import { ClubForm } from '../../club-form';
import { ClubSectionHeader } from '../tabs';
import { Invites, ScheduleEditor, SetBookForm } from './manage-client';

export const metadata = { title: 'Manage club' };

function Panel({ id, title, hint, children, className = '' }: { id?: string; title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`card scroll-mt-24 ${className}`}>
      <h3 className="font-serif text-xl font-medium">{title}</h3>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

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
    <div>
      <ClubSectionHeader title="Manage club" subtitle="Pick books and schedules, invite members, and edit club details." />
      {created && (
        <div className="mb-6 animate-pop-in rounded-2xl border border-sage-200 bg-sage-50 p-5">
          <div className="h3">Your club is ready.</div>
          <p className="mt-1 text-sm text-muted">Next: pick a book and a weekly schedule, then share an invite link in your WhatsApp group.</p>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Panel id="book" title={cb ? 'Change the current book' : 'Pick a book'} hint="Members are notified, and weekly spoiler-gated threads are created." className="xl:col-span-2">
          <SetBookForm clubId={club.id} preselected={preselected} />
        </Panel>

        {cb && (
          <Panel title={`Schedule for ${cb.book.title}`} hint="Changing it adjusts the weekly threads." className="xl:col-span-2">
            <ScheduleEditor clubId={club.id} clubBook={cb} />
          </Panel>
        )}

        <Panel id="invites" title="Invite members" hint="Anyone with a link can join, even if the club is private.">
          <Invites clubId={club.id} initial={invites} />
        </Panel>

        <Panel title="Club details">
          <ClubForm
            clubId={club.id}
            initial={{ name: club.name, description: club.description ?? '', city: club.city, language: club.language, visibility: club.visibility }}
          />
        </Panel>

        {club.myRole === 'owner' && (
          <section className="rounded-2xl border border-danger/30 bg-surface p-5 xl:col-span-2">
            <h3 className="font-serif text-xl font-medium text-danger">Danger zone</h3>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted">Deleting the club removes it from listings and closes its discussions for everyone.</p>
              <ActionButton path={`/v1/clubs/${club.id}`} method="DELETE" className="btn-ghost btn-danger" confirm="Delete this club for everyone?" redirectTo="/clubs">
                Delete club
              </ActionButton>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
