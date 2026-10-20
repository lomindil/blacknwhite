import type { ClubSummary } from '@bnw/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ActionButton } from '@/components/actions';
import { BookCover } from '@/components/ui';
import { cityName, languageName, plural } from '@/lib/format';
import { api, getMe, ServerApiError } from '@/lib/server-api';

export const metadata = { title: "You're invited", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const me = await getMe();
  let invite: { club: ClubSummary; description: string | null; alreadyMember: boolean };
  try {
    invite = await api(`/v1/invites/${code}`);
  } catch (e) {
    const msg = e instanceof ServerApiError && e.status !== 404 ? e.message : 'This invite link is not valid.';
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="h2">{msg}</h1>
        <p className="mt-2 text-muted">Ask the organizer for a new link.</p>
      </div>
    );
  }
  if (invite.alreadyMember) redirect(`/clubs/${invite.club.slug}`);
  const { club } = invite;

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <div className="eyebrow mb-3">You're invited to join</div>
      <h1 className="h1">{club.name}</h1>
      <div className="mt-2 text-sm text-muted">
        {[club.city && cityName(club.city), languageName(club.language), plural(club.memberCount, 'member')].filter(Boolean).join(' · ')}
      </div>
      {invite.description && <p className="mx-auto mt-6 max-w-md text-left text-muted">{invite.description}</p>}
      {club.currentBook && (
        <div className="mx-auto mt-6 flex max-w-xs items-center gap-4 border border-line p-3 text-left">
          <BookCover book={club.currentBook} size="sm" />
          <div>
            <div className="eyebrow">Reading</div>
            <div className="font-serif">{club.currentBook.title}</div>
          </div>
        </div>
      )}
      <div className="mt-8">
        {me ? (
          <ActionButton path={`/v1/invites/${code}/accept`} redirectTo={`/clubs/${club.slug}`} className="btn px-8 py-3">
            Join {club.name}
          </ActionButton>
        ) : (
          <Link href={`/login?next=/invite/${code}`} className="btn px-8 py-3">Sign in with Google to join</Link>
        )}
      </div>
    </div>
  );
}
