import type { BookSummary, ClubSummary, EventSummary, UserSummary } from '@bnw/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cityName, dayParts, languageName, plural } from '@/lib/format';

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const PATTERNS = [
  'repeating-linear-gradient(45deg, transparent 0 6px, rgb(255 255 255 / 0.07) 6px 7px)',
  'repeating-linear-gradient(0deg, transparent 0 9px, rgb(255 255 255 / 0.08) 9px 10px)',
  'radial-gradient(circle at 30% 20%, rgb(255 255 255 / 0.1) 0 18%, transparent 19%)',
  'repeating-linear-gradient(90deg, transparent 0 14px, rgb(255 255 255 / 0.06) 14px 16px)',
];

/** A typographic black-and-white cover; real covers are shown in greyscale. */
export function BookCover({ book, size = 'md' }: { book: Pick<BookSummary, 'title' | 'authors' | 'coverUrl'>; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-12 h-[72px] text-[7px]', md: 'w-24 h-36 text-[10px]', lg: 'w-40 h-60 text-sm' }[size];
  if (book.coverUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={book.coverUrl} alt="" className={`${dims} shrink-0 border border-line object-cover grayscale transition hover:grayscale-0`} />;
  }
  const h = hash(book.title);
  return (
    <div
      className={`${dims} relative flex shrink-0 flex-col justify-between overflow-hidden bg-[#141414] p-2 text-[#f2f2ec]`}
      style={{ backgroundImage: PATTERNS[h % PATTERNS.length] }}
      aria-hidden
    >
      <div className="font-serif leading-tight" style={{ fontSize: '1.2em' }}>
        {book.title.length > 48 ? `${book.title.slice(0, 46)}…` : book.title}
      </div>
      <div className="uppercase tracking-wider opacity-70">{book.authors[0] ?? ''}</div>
    </div>
  );
}

export function Avatar({ user, size = 32 }: { user: Pick<UserSummary, 'displayName' | 'avatarUrl'>; size?: number }) {
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" width={size} height={size} className="shrink-0 rounded-full grayscale" style={{ width: size, height: size }} referrerPolicy="no-referrer" />;
  }
  const initials = user.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-soft font-medium text-muted"
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
    <Link href={`/books/${book.id}`} className="group flex gap-4 py-3">
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
    <Link href={`/clubs/${club.slug}`} className="card group flex flex-col gap-3 transition hover:border-ink">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="h3 group-hover:underline">{club.name}</div>
          <div className="mt-1 text-xs text-muted">
            {[club.city && cityName(club.city), languageName(club.language), plural(club.memberCount, 'member')].filter(Boolean).join(' · ')}
          </div>
        </div>
        {club.visibility === 'private' && <span className="chip">Private</span>}
      </div>
      {club.currentBook ? (
        <div className="flex items-center gap-3 border-t border-line pt-3">
          <BookCover book={club.currentBook} size="sm" />
          <div className="min-w-0 text-sm">
            <div className="eyebrow">Reading</div>
            <div className="truncate font-serif">{club.currentBook.title}</div>
          </div>
        </div>
      ) : (
        <div className="border-t border-line pt-3 text-sm text-muted">Choosing the next book</div>
      )}
    </Link>
  );
}

export function EventCard({ event }: { event: EventSummary }) {
  const d = dayParts(event.startsAt);
  const host = event.club?.name ?? event.bookstore?.name;
  return (
    <Link href={`/events/${event.id}`} className="group flex gap-4 border-b border-line py-4 last:border-0">
      <div className="flex w-14 shrink-0 flex-col items-center border border-ink py-1">
        <span className="text-[10px] tracking-widest">{d.month}</span>
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
    <div className="border border-dashed border-line px-6 py-10 text-center">
      <div className="font-serif text-lg">{title}</div>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
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
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-ink pb-2">
        <h2 className="h2">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
