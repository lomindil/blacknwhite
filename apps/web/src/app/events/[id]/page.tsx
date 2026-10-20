import type { EventDetail, UserSummary } from '@bnw/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton, ReportButton } from '@/components/actions';
import { Markdown } from '@/components/markdown';
import { Avatar } from '@/components/ui';
import { cityName, formatDateTime } from '@/lib/format';
import { api, apiOrNotFound, getMe } from '@/lib/server-api';
import { RsvpButtons } from './rsvp';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const e = await api<EventDetail>(`/v1/events/${id}`).catch(() => null);
  return e ? { title: e.title, description: `${formatDateTime(e.startsAt)} · ${e.mode === 'online' ? 'Online' : [e.venueName, e.city && cityName(e.city)].filter(Boolean).join(', ')}` } : {};
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const me = await getMe();
  const e = await apiOrNotFound<EventDetail>(`/v1/events/${id}`);
  const attendees = e.canManage ? await api<{ user: UserSummary; status: string }[]>(`/v1/events/${id}/rsvps`) : [];
  const past = new Date(e.endsAt ?? e.startsAt) < new Date();
  const host = e.club ? { href: `/clubs/${e.club.slug}`, name: e.club.name } : e.bookstore ? { href: `/bookstores/${e.bookstore.slug}`, name: e.bookstore.name } : null;

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_18rem]">
      <div>
        <div className="eyebrow mb-2">{e.mode === 'online' ? 'Online event' : `In person${e.city ? ` · ${cityName(e.city)}` : ''}`}</div>
        <h1 className={`h1 ${e.cancelled ? 'line-through opacity-60' : ''}`}>{e.title}</h1>
        {e.cancelled && <p className="mt-3 border border-danger p-3 text-sm text-danger">This event has been cancelled.</p>}
        <dl className="mt-6 grid gap-4 border-y border-line py-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="label">When</dt>
            <dd>{formatDateTime(e.startsAt)}{e.endsAt && ` – ${formatDateTime(e.endsAt)}`} IST</dd>
          </div>
          <div>
            <dt className="label">Where</dt>
            <dd>
              {e.mode === 'online' ? (
                e.meetingUrl ? <a href={e.meetingUrl} target="_blank" rel="noopener noreferrer" className="link break-all">{e.meetingUrl}</a> : 'Online — the link appears after you RSVP'
              ) : (
                <>
                  {[e.venueName, e.area].filter(Boolean).join(', ')}
                  {e.address && <div className="text-muted">{e.address}</div>}
                  {e.addressHidden && <div className="text-muted">Exact address shown after you RSVP</div>}
                </>
              )}
            </dd>
          </div>
          {host && (
            <div>
              <dt className="label">Hosted by</dt>
              <dd><Link href={host.href} className="link">{host.name}</Link></dd>
            </div>
          )}
          <div>
            <dt className="label">Going</dt>
            <dd>{e.goingCount}{e.capacity ? ` of ${e.capacity} spots` : ''}{e.waitlistCount > 0 && ` · ${e.waitlistCount} on the waitlist`}</dd>
          </div>
        </dl>
        {e.description && <div className="mt-6"><Markdown text={e.description} /></div>}
        {e.canManage && attendees.length > 0 && (
          <section className="mt-10">
            <h2 className="h3 mb-3">Attendees</h2>
            <ul className="divide-y divide-line border-y border-line text-sm">
              {attendees.map((a) => (
                <li key={a.user.id} className="flex items-center gap-3 py-2">
                  <Avatar user={a.user} size={24} />
                  <span className="flex-1">{a.user.displayName}</span>
                  <span className="chip capitalize">{a.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <aside className="space-y-4">
        {!e.cancelled && !past && (me ? <RsvpButtons eventId={e.id} status={e.myRsvp} /> : <Link href={`/login?next=/events/${e.id}`} className="btn w-full">Sign in to RSVP</Link>)}
        {past && <p className="text-sm text-muted">This event has ended.</p>}
        <a href={`/api/v1/events/${e.id}/ics`} className="btn-ghost w-full">Add to calendar (.ics)</a>
        {e.canManage && !e.cancelled && !past && (
          <ActionButton path={`/v1/events/${e.id}`} method="DELETE" className="btn-ghost btn-danger w-full" confirm="Cancel this event? Everyone who RSVP'd will be notified.">
            Cancel event
          </ActionButton>
        )}
        {me && !e.canManage && <ReportButton targetType="event" targetId={e.id} />}
      </aside>
    </div>
  );
}
