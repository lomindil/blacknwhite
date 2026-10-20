'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import {
  IconCalendar,
  IconChat,
  IconCheck,
  IconChevron,
  IconImport,
  IconLanguage,
  IconProgress,
  IconShield,
  IconUsers,
  IconVote,
} from '@/components/icons';
import { useInView } from '@/components/reveal';
import { ChatMock, ClubsMock, LocalMock, MeetMock, SafetyMock, ShelvesMock, TrackMock, VoteMock } from './mocks';

type Tone = 'sage' | 'ochre' | 'sky' | 'plum' | 'clay' | 'rose';

// Literal class strings per tone so Tailwind keeps them.
const TONES: Record<Tone, { panel: string; icon: string; tab: string; bar: string; eyebrow: string }> = {
  sage: { panel: 'bg-sage-50', icon: 'bg-sage-100 text-sage-700', tab: 'bg-sage-50 text-sage-800 ring-sage-200', bar: 'bg-sage-600', eyebrow: 'text-sage-700' },
  ochre: { panel: 'bg-ochre-50', icon: 'bg-ochre-100 text-ochre-700', tab: 'bg-ochre-50 text-ochre-800 ring-ochre-200', bar: 'bg-ochre-600', eyebrow: 'text-ochre-700' },
  sky: { panel: 'bg-sky-50', icon: 'bg-sky-100 text-sky-700', tab: 'bg-sky-50 text-sky-800 ring-sky-200', bar: 'bg-sky-600', eyebrow: 'text-sky-700' },
  plum: { panel: 'bg-plum-50', icon: 'bg-plum-100 text-plum-700', tab: 'bg-plum-50 text-plum-800 ring-plum-200', bar: 'bg-plum-600', eyebrow: 'text-plum-700' },
  clay: { panel: 'bg-clay-50', icon: 'bg-clay-100 text-clay-700', tab: 'bg-clay-50 text-clay-800 ring-clay-200', bar: 'bg-clay-600', eyebrow: 'text-clay-700' },
  rose: { panel: 'bg-rose-50', icon: 'bg-rose-100 text-rose-700', tab: 'bg-rose-50 text-rose-800 ring-rose-200', bar: 'bg-rose-600', eyebrow: 'text-rose-700' },
};

interface Slide {
  id: string;
  photo: string;
  photoAlt: string;
  tab: string;
  Icon: ComponentType<{ size?: number }>;
  tone: Tone;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  cta: { href: string; label: string };
  Mock: ComponentType<{ active: boolean }>;
}

// The basics of running a club come first; what makes us different follows.
const SLIDES: Slide[] = [
  {
    id: 'clubs',
    photo: '/images/landing/feat-clubs.jpg',
    photoAlt: 'Members of a book club chatting in a cosy library lounge',
    tab: 'Clubs',
    Icon: IconUsers,
    tone: 'sage',
    eyebrow: 'Start or join',
    title: 'Start a book club in a minute — or find one near you',
    body: 'Make it public so readers can discover it, or private and invite-only. Browse clubs by city, language or what they’re reading right now.',
    points: ['Public or invite-only clubs', 'Co-organizers and member roles', 'Invite links you can drop in your WhatsApp group'],
    cta: { href: '/clubs', label: 'Browse clubs' },
    Mock: ClubsMock,
  },
  {
    id: 'vote',
    photo: '/images/landing/feat-vote.jpg',
    photoAlt: 'Hands holding open books around a table',
    tab: 'Vote on books',
    Icon: IconVote,
    tone: 'ochre',
    eyebrow: 'Decide together',
    title: 'Pick the next book together',
    body: 'No more endless “what next?” threads. Shortlist a few books, let everyone vote, and turn the winner into your next read with one click.',
    points: ['Book polls, meeting-time polls and anything else', 'Change your vote until the poll closes', 'Winner becomes the club’s current book'],
    cta: { href: '/login', label: 'Run your first poll' },
    Mock: VoteMock,
  },
  {
    id: 'track',
    photo: '/images/landing/feat-track.jpg',
    photoAlt: 'A young reader in glasses reading a book',
    tab: 'Track reading',
    Icon: IconProgress,
    tone: 'sky',
    eyebrow: 'Read on a schedule',
    title: 'A weekly plan for the club, and your own progress',
    body: 'Set chapters per week and everyone knows what to read before the next meetup. Track your progress by chapter, keep shelves, and rate what you finish.',
    points: ['Weekly chapter schedule', 'Progress by chapter or percent', 'Want to read, reading and finished shelves'],
    cta: { href: '/books', label: 'Find a book' },
    Mock: TrackMock,
  },
  {
    id: 'chat',
    photo: '/images/landing/feat-chat.jpg',
    photoAlt: 'Two friends reading and chatting on the floor',
    tab: 'Chat',
    Icon: IconChat,
    tone: 'plum',
    eyebrow: 'Talk it through',
    title: 'Discuss every chapter — without spoilers',
    body: 'Each week gets its own thread that unlocks when you finish those chapters, so nobody spoils the ending. Replies arrive live, and you can message anyone in your club.',
    points: ['Threads unlock as you read', 'Hide a line behind a spoiler tag', 'Direct messages with club-mates'],
    cta: { href: '/login', label: 'Join the conversation' },
    Mock: ChatMock,
  },
  {
    id: 'meet',
    photo: '/images/landing/feat-meet.jpg',
    photoAlt: 'Two friends discussing a book in a library',
    tab: 'Meetups',
    Icon: IconCalendar,
    tone: 'clay',
    eyebrow: 'Meet up',
    title: 'Schedule meetups, online or in person',
    body: 'Post a meetup, collect RSVPs and stop chasing people for a headcount. Everyone who’s going gets reminders the day before and two hours before.',
    points: ['RSVPs with capacity and an automatic waitlist', 'Calendar invites and WhatsApp or email reminders', 'Meeting links and addresses shared only with attendees'],
    cta: { href: '/events', label: 'See upcoming events' },
    Mock: MeetMock,
  },
  {
    id: 'local',
    photo: '/images/landing/feat-local.jpg',
    photoAlt: 'A street bookseller with books laid out on the pavement',
    tab: 'Your city & language',
    Icon: IconLanguage,
    tone: 'rose',
    eyebrow: 'Made for India',
    title: 'Clubs, bookstores and books in your city and language',
    body: 'Find what’s happening near you — club meetups, silent reading hours, author talks and independent bookstores. Read and discuss in 15 Indian languages.',
    points: ['City pages for clubs, events and bookstores', 'Search authors in native script', 'Regional-language clubs and books'],
    cta: { href: '/cities', label: 'Explore cities' },
    Mock: LocalMock,
  },
  {
    id: 'shelves',
    photo: '/images/landing/feat-shelves.jpg',
    photoAlt: 'Inside a bright bookstore with bestseller shelves',
    tab: 'Bring your shelves',
    Icon: IconImport,
    tone: 'sage',
    eyebrow: 'Switch in seconds',
    title: 'Bring your Goodreads shelves. Buy at the best price.',
    body: 'Import years of shelves and ratings from Goodreads or StoryGraph in about 30 seconds. When it’s time to buy, compare prices across stores.',
    points: ['Goodreads and StoryGraph CSV import', 'Amazon, Flipkart and partner bookstores', 'Add missing Indian titles yourself'],
    cta: { href: '/me/import', label: 'Import your shelves' },
    Mock: ShelvesMock,
  },
  {
    id: 'safety',
    photo: '/images/landing/feat-safety.jpg',
    photoAlt: 'A woman smiling while reading on her sofa at home',
    tab: 'Safe & private',
    Icon: IconShield,
    tone: 'plum',
    eyebrow: 'Safe by design',
    title: 'A friendly space, private by default',
    body: 'We never store where you are — only your city. Messages stay between people who share a club, and blocking or reporting is always one tap away.',
    points: ['No precise location, ever', 'Your data stays in India', 'Export or delete your account any time'],
    cta: { href: '/privacy', label: 'Read our privacy policy' },
    Mock: SafetyMock,
  },
];

const DURATION = 7000;

export function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>(0.35);
  const touchX = useRef<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const go = (i: number) => setIndex((i + SLIDES.length) % SLIDES.length);
  const autoplay = !reduced;
  const paused = hovered || focused || !inView;

  // Keep the active tab visible by scrolling only the tab row (never the page).
  const tabRow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = tabRow.current;
    const tab = tabRefs.current[index];
    if (!row || !tab) return;
    row.scrollTo({ left: tab.offsetLeft - row.clientWidth / 2 + tab.clientWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
  }, [index, reduced]);

  return (
    <div
      ref={ref}
      role="region"
      aria-roledescription="carousel"
      aria-label="What you can do"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      {/* Tabs */}
      <div ref={tabRow} className="relative -mx-4 mb-8 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none]">
        <div role="tablist" aria-label="Features" className="flex w-max gap-2">
          {SLIDES.map((s, i) => {
            const active = i === index;
            const t = TONES[s.tone];
            return (
              <button
                key={s.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                id={`tab-${s.id}`}
                aria-selected={active}
                aria-controls={`panel-${s.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => go(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    go(index + 1);
                    tabRefs.current[(index + 1) % SLIDES.length]?.focus();
                  } else if (e.key === 'ArrowLeft') {
                    go(index - 1);
                    tabRefs.current[(index - 1 + SLIDES.length) % SLIDES.length]?.focus();
                  }
                }}
                className={`relative flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm transition duration-300 ${
                  active ? `${t.tab} font-medium ring-1` : 'bg-surface text-muted ring-1 ring-line hover:text-ink hover:ring-sage-200'
                }`}
              >
                <s.Icon size={16} />
                {s.tab}
                {active && autoplay && (
                  <span
                    key={`${index}-${s.id}`}
                    className={`absolute bottom-0 left-0 h-0.5 w-full origin-left ${t.bar}`}
                    style={{ animation: `fill ${DURATION}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }}
                    onAnimationEnd={() => go(index + 1)}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slides */}
      <div
        className="overflow-x-clip"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        <div className="flex transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]" style={{ transform: `translateX(-${index * 100}%)` }}>
          {SLIDES.map((s, i) => {
            const active = i === index;
            const t = TONES[s.tone];
            return (
              <div
                key={s.id}
                id={`panel-${s.id}`}
                role="tabpanel"
                aria-roledescription="slide"
                aria-labelledby={`tab-${s.id}`}
                aria-label={`${i + 1} of ${SLIDES.length}`}
                aria-hidden={!active}
                inert={!active}
                className="w-full shrink-0"
              >
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                  <div className={`transition-all duration-700 ${active ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <span className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${t.icon}`}>
                      <s.Icon size={24} />
                    </span>
                    <div className={`mb-2 text-xs font-semibold uppercase tracking-[0.16em] ${t.eyebrow}`}>{s.eyebrow}</div>
                    <h3 className="font-serif text-3xl font-medium leading-tight tracking-tight sm:text-[2.1rem]">{s.title}</h3>
                    <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{s.body}</p>
                    <ul className="mt-6 space-y-2.5">
                      {s.points.map((p) => (
                        <li key={p} className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${t.icon}`}>
                            <IconCheck size={13} />
                          </span>
                          {p}
                        </li>
                      ))}
                    </ul>
                    <Link href={s.cta.href} className="link mt-7 inline-flex items-center gap-1 font-medium no-underline hover:underline">
                      {s.cta.label} →
                    </Link>
                  </div>
                  <div className="relative pb-32 pr-3 pt-3 sm:pb-28">
                    {/* accent block behind the photo keeps each feature's colour */}
                    <div className={`absolute right-0 top-0 h-3/4 w-3/4 rounded-[2rem] ${t.panel}`} aria-hidden>
                      <div className="dots absolute inset-0 rounded-[2rem]" />
                    </div>
                    <div className="relative ml-auto aspect-[4/3] w-full overflow-hidden rounded-[2rem] shadow-lift lg:w-[90%]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.photo}
                        alt={s.photoAlt}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        className={`h-full w-full object-cover transition-transform duration-[1600ms] ease-out ${active ? 'scale-100' : 'scale-110'}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-transparent" aria-hidden />
                    </div>
                    <div
                      className={`absolute bottom-0 left-0 w-[88%] origin-bottom-left scale-[0.84] transition-all delay-200 duration-700 sm:w-[60%] sm:scale-90 ${
                        active ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                      }`}
                    >
                      <s.Mock active={active && inView} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-between">
        <div className="flex gap-1.5" aria-hidden>
          {SLIDES.map((s, i) => (
            <span key={s.id} className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? `w-6 ${TONES[s.tone].bar}` : 'w-1.5 bg-line'}`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-2 text-sm tabular-nums text-muted">
            {index + 1} / {SLIDES.length}
          </span>
          <button type="button" onClick={() => go(index - 1)} className="btn-ghost h-10 w-10 p-0" aria-label="Previous feature">
            <IconChevron dir="left" size={18} />
          </button>
          <button type="button" onClick={() => go(index + 1)} className="btn-ghost h-10 w-10 p-0" aria-label="Next feature">
            <IconChevron size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

