import type { BookSummary, ClubSummary, EventSummary, UserSummary } from '@bnw/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cityName, dayParts, languageName, plural } from '@/lib/format';

export function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Literal class strings so Tailwind keeps them.
const COVER_TONES = [
  { bg: 'bg-sage-100', text: 'text-sage-800', rule: 'bg-sage-300' },
  { bg: 'bg-clay-100', text: 'text-clay-800', rule: 'bg-clay-300' },
  { bg: 'bg-sky-100', text: 'text-sky-800', rule: 'bg-sky-300' },
  { bg: 'bg-ochre-100', text: 'text-ochre-800', rule: 'bg-ochre-300' },
  { bg: 'bg-plum-100', text: 'text-plum-800', rule: 'bg-plum-300' },
  { bg: 'bg-rose-100', text: 'text-rose-800', rule: 'bg-rose-300' },
];
const AVATAR_TONES = ['bg-sage-100 text-sage-700', 'bg-clay-100 text-clay-700', 'bg-sky-100 text-sky-700', 'bg-ochre-100 text-ochre-700', 'bg-plum-100 text-plum-700', 'bg-rose-100 text-rose-700'];

/** A soft typographic cover when there's no cover image. Same book → same colour. */
export function BookCover({ book, size = 'md' }: { book: Pick<BookSummary, 'title' | 'authors' | 'coverUrl'>; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-12 h-[72px] text-[7px] rounded-md', md: 'w-24 h-36 text-[10px] rounded-lg', lg: 'w-40 h-60 text-sm rounded-xl' }[size];
  if (book.coverUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={book.coverUrl} alt="" className={`${dims} shrink-0 border border-line bg-sand object-cover shadow-card`} loading="lazy" />;
  }
  const tone = COVER_TONES[hash(book.title) % COVER_TONES.length];
  return (
    <div className={`${dims} ${tone.bg} ${tone.text} relative flex shrink-0 flex-col justify-between overflow-hidden p-2 shadow-card`} aria-hidden>
      <span className="absolute inset-y-0 left-0 w-[6%] bg-black/5" />
      <div className="relative font-serif font-medium leading-tight" style={{ fontSize: '1.2em' }}>
        {book.title.length > 48 ? `${book.title.slice(0, 46)}…` : book.title}
      </div>
      <div className="relative">
        <div className={`mb-1 h-px w-1/3 ${tone.rule}`} />
        <div className="uppercase tracking-wider opacity-75">{book.authors[0] ?? ''}</div>
      </div>
    </div>
  );
}

export function Avatar({ user, size = 32 }: { user: Pick<UserSummary, 'displayName' | 'avatarUrl'>; size?: number }) {
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} referrerPolicy="no-referrer" />;
  }
  const initials = user.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${AVATAR_TONES[hash(user.displayName) % AVATAR_TONES.length]}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function UserLink({ user }: { user: UserSummary }) {
  return (
    <Link href={`/readers/${user.id}`} className="inline-flex items-center gap-2 hover:underline">
      <Avatar user={user} size={24} />
      <span className="text-sm">{user.displayName}</span>
    </Link>
  );
}

export function BookCard({ book, note }: { book: BookSummary; note?: ReactNode }) {
  return (
    <Link href={`/books/${book.id}`} className="group flex gap-4 rounded-xl px-2 py-3 transition hover:bg-surface">
      <BookCover book={book} size="sm" />
      <div className="min-w-0">
        <div className="font-serif text-base leading-snug group-hover:underline">{book.title}</div>
        <div className="text-sm text-muted">{book.authors.join(', ')}</div>
        {note && <div className="mt-1 text-xs text-muted">{note}</div>}
      </div>
    </Link>
  );
}

export function ClubCard({ club }: { club: ClubSummary }) {
  return (
    <Link href={`/clubs/${club.slug}`} className="card card-hover group flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="h3 group-hover:underline">{club.name}</div>
          <div className="mt-1 text-xs text-muted">
            {[club.city && cityName(club.city), languageName(club.language), plural(club.memberCount, 'member')].filter(Boolean).join(' · ')}
          </div>
        </div>
        {club.visibility === 'private' && <span className="chip border-plum-200 bg-plum-50 text-plum-700">Private</span>}
      </div>
      {club.currentBook ? (
        <div className="flex items-center gap-3 border-t border-line/70 pt-3">
          <BookCover book={club.currentBook} size="sm" />
          <div className="min-w-0 text-sm">
            <div className="eyebrow">Reading</div>
            <div className="truncate font-serif">{club.currentBook.title}</div>
          </div>
        </div>
      ) : (
        <div className="border-t border-line/70 pt-3 text-sm text-muted">Choosing the next book</div>
      )}
    </Link>
  );
}

export function EventCard({ event }: { event: EventSummary }) {
  const d = dayParts(event.startsAt);
  const host = event.club?.name ?? event.bookstore?.name;
  return (
    <Link href={`/events/${event.id}`} className="group flex gap-4 border-b border-line/70 py-4 transition last:border-0 hover:translate-x-0.5">
      <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-clay-50 py-1.5 text-clay-700 ring-1 ring-clay-100 transition group-hover:bg-clay-100">
        <span className="text-[10px] font-semibold tracking-widest">{d.month}</span>
        <span className="font-serif text-2xl leading-none">{d.day}</span>
      </div>
      <div className="min-w-0">
        <div className={`font-serif text-base leading-snug group-hover:underline ${event.cancelled ? 'line-through opacity-60' : ''}`}>{event.title}</div>
        <div className="mt-0.5 text-sm text-muted">
          {d.time} · {event.mode === 'online' ? 'Online' : [event.venueName, event.area, event.city && cityName(event.city)].filter(Boolean).join(', ')}
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {host && <>Hosted by {host} · </>}
          {event.goingCount} going{event.capacity ? ` of ${event.capacity}` : ''}
          {event.cancelled && ' · Cancelled'}
        </div>
      </div>
    </Link>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50/50 px-6 py-10 text-center">
      <div className="font-serif text-lg">{title}</div>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex animate-fade-up flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="h1">{title}</h1>
        {children && <div className="mt-2 max-w-2xl text-muted">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
        <h2 className="h2 relative">{title}<span className="absolute -bottom-[11px] left-0 h-0.5 w-10 rounded-full bg-sage-600" aria-hidden /></h2>
        {action}
      </div>
      {children}
    </section>
  );
}
