import type { ClubSummary } from '@bnw/shared';
import Link from 'next/link';
import { IconArrow, IconCalendar, IconCheck, IconLock, IconPin, IconVote } from '@/components/icons';
import { Reveal } from '@/components/reveal';
import { BookCover, ClubCard } from '@/components/ui';
import { BRAND } from '@/lib/brand';
import { FeatureCarousel } from './feature-carousel';
import { Faces } from './mocks';

const BASICS = ['Start & join clubs', 'Vote on books', 'Schedule meetups', 'Track your reading', 'Chat without spoilers'];

/** Wave that ends a coloured band and hands over to the next section's colour. */
function Wave({ fill }: { fill: string }) {
  return (
    <svg className="absolute inset-x-0 bottom-0 block h-12 w-full sm:h-20" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
      <path d="M0 48c180 26 400 34 720 10S1260 6 1440 34v46H0z" className={fill} />
    </svg>
  );
}

function Hero() {
  return (
    <section className="bleed relative -mt-8 overflow-hidden bg-gradient-to-b from-sage-100 via-sage-50 to-[#F6F8F3] sm:-mt-12">
      {/* Atmosphere */}
      <div className="dots absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
      <div className="absolute -left-24 -top-28 h-96 w-96 animate-drift rounded-full bg-clay-100/80 blur-3xl" aria-hidden />
      <div className="absolute -right-20 top-10 h-[28rem] w-[28rem] animate-drift rounded-full bg-sky-100/80 blur-3xl [animation-delay:-6s]" aria-hidden />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-drift rounded-full bg-ochre-100/70 blur-3xl [animation-delay:-12s]" aria-hidden />

      <div className="relative mx-auto grid max-w-page items-center gap-14 px-4 pb-28 pt-16 sm:pb-36 sm:pt-24 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mb-6 inline-flex animate-fade-up items-center gap-2 rounded-full border border-sage-200 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-sage-700 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-300" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sage-600" />
            </span>
            Book clubs across India · free for readers
          </div>
          <h1 className="font-serif text-[2.6rem] font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.1rem]">
            <span className="block animate-fade-up [animation-delay:80ms]">Start a book club.</span>
            <span className="block animate-fade-up text-sage-700 [animation-delay:200ms]">Find your people.</span>
            <span className="block animate-fade-up [animation-delay:320ms]">
              Read{' '}
              <span className="relative inline-block">
                together.
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
                  <path d="M3 8c40-6 90-7 194-2" fill="none" stroke="#E3B39E" strokeWidth="5" strokeLinecap="round" strokeDasharray="400" className="animate-draw" />
                </svg>
              </span>
            </span>
          </h1>
          <p className="mt-7 max-w-xl animate-fade-up text-lg leading-relaxed text-muted [animation-delay:440ms]">{BRAND.description}</p>
          <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:560ms]">
            <Link href="/login" className="btn px-7 py-3 text-base">
              Get started — it’s free <IconArrow size={18} />
            </Link>
            <Link href="/clubs" className="btn-ghost px-7 py-3 text-base">
              Explore clubs
            </Link>
          </div>
          <ul className="mt-9 flex animate-fade-up flex-wrap gap-x-5 gap-y-2 text-sm text-ink/80 [animation-delay:680ms]">
            {BASICS.map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <IconCheck size={15} className="text-sage-600" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <HeroCollage />
      </div>
      <Wave fill="fill-surface" />
    </section>
  );
}

/** A floating composition of the product's core moments: club, vote, meetup, spoiler gate. */
function HeroCollage() {
  return (
    <div className="relative mx-auto h-[440px] w-full max-w-[480px] animate-pop-in [animation-delay:300ms] sm:h-[500px]" aria-hidden>
      {/* fanned covers */}
      <div className="absolute right-10 top-[16%] rotate-[8deg] animate-float-slow [animation-delay:-2s]">
        <BookCover book={{ title: 'Pather Panchali', authors: ['Bibhutibhushan'], coverUrl: null }} />
      </div>
      <div className="absolute left-8 top-[20%] -rotate-[10deg] animate-float-slow">
        <BookCover book={{ title: 'Ponniyin Selvan', authors: ['Kalki'], coverUrl: null }} />
      </div>

      {/* main club card */}
      <div className="absolute left-1/2 top-[47%] w-[300px] -translate-x-1/2 -translate-y-1/2 sm:w-[340px]">
        <div className="animate-float rounded-3xl border border-white bg-white/95 p-5 shadow-lift backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-serif text-lg leading-tight">Sunday Fiction Circle</div>
              <div className="text-xs text-muted">Kochi · 24 members</div>
            </div>
            <span className="rounded-full bg-sage-50 px-2.5 py-1 text-[11px] font-medium text-sage-700">Joined</span>
          </div>
          <div className="flex gap-3">
            <BookCover book={{ title: 'The God of Small Things', authors: ['Arundhati Roy'], coverUrl: null }} size="sm" />
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">This week</div>
              <div className="text-sm">Chapters 9–12</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-50">
                <div className="h-full w-[62%] rounded-full bg-sky-600" />
              </div>
              <div className="mt-1 text-[11px] text-muted">You’re on chapter 10</div>
            </div>
          </div>
          <div className="mt-4 border-t border-line/70 pt-3">
            <Faces extra="+20 reading along" />
          </div>
        </div>
      </div>

      {/* floating chips, placed around the card so they never cover it */}
      <div className="absolute left-0 top-[4%] animate-float [animation-delay:-2.5s] sm:-left-2">
        <div className="rounded-2xl rounded-bl-md bg-sage-700 px-3.5 py-2 text-xs text-white shadow-lift">That ending of chapter 10 😮</div>
      </div>
      <div className="absolute right-0 top-[9%] animate-float [animation-delay:-4.5s]">
        <div className="flex items-center gap-2 rounded-full border border-white bg-white/95 px-3 py-1.5 text-[11px] text-plum-700 shadow-lift">
          <IconLock size={13} /> Week 4 unlocks at ch. 12
        </div>
      </div>
      <div className="absolute bottom-[9%] left-0 animate-float [animation-delay:-1s] sm:-left-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-white bg-white/95 px-3.5 py-2.5 shadow-lift">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ochre-100 text-ochre-700"><IconVote size={16} /></span>
          <div className="text-xs">
            <div className="font-medium">Next read: Tomb of Sand</div>
            <div className="text-muted">won with 12 votes</div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 animate-float [animation-delay:-3s] sm:-right-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-white bg-white/95 px-3.5 py-2.5 shadow-lift">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-clay-100 text-clay-700"><IconCalendar size={16} /></span>
          <div className="text-xs">
            <div className="font-medium">Meetup · Sat, 5 pm</div>
            <div className="text-muted">8 going · reminder sent</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: '1',
    tone: 'bg-sage-100 text-sage-700',
    title: 'Find or start your club',
    body: 'Browse clubs by city, language or book — or start your own in a minute and share the invite link with your group.',
  },
  {
    n: '2',
    tone: 'bg-ochre-100 text-ochre-700',
    title: 'Pick a book and a pace',
    body: 'Vote on what to read, set chapters per week, and track your progress. Discussions open up as you read.',
  },
  {
    n: '3',
    tone: 'bg-clay-100 text-clay-700',
    title: 'Meet, talk, repeat',
    body: 'RSVP to meetups online or nearby, get reminders where you already are, and keep the conversation going.',
  },
];

export function Landing({ clubs, cities }: { clubs: ClubSummary[]; cities: { city: string; name: string; clubs: number }[] }) {
  return (
    <div className="-mb-8 sm:-mb-12">
      <Hero />

      {/* Features */}
      <section className="bleed bg-surface py-20 sm:py-28">
        <div className="mx-auto max-w-page px-4">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <div className="eyebrow mb-3">Everything your club needs</div>
            <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">From the first meetup to the last chapter</h2>
            <p className="mt-4 text-lg text-muted">All the everyday tools of running a book club in one place — plus the things WhatsApp groups never could do.</p>
          </Reveal>
          <Reveal delay={100}>
            <FeatureCarousel />
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="bleed border-y border-line/70 bg-paper py-20 sm:py-24">
        <div className="mx-auto max-w-page px-4">
          <Reveal className="mb-14 text-center">
            <div className="eyebrow mb-3">How it works</div>
            <h2 className="font-serif text-4xl font-medium tracking-tight">Three steps to your next great read</h2>
          </Reveal>
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            <div className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-line md:block" aria-hidden />
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 150} className="relative text-center">
                <span className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-full font-serif text-2xl ring-8 ring-paper ${s.tone}`}>{s.n}</span>
                <h3 className="mt-5 font-serif text-xl font-medium">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-muted">{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Clubs */}
      {clubs.length > 0 && (
        <section className="bleed bg-surface py-20 sm:py-24">
          <div className="mx-auto max-w-page px-4">
            <Reveal className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="eyebrow mb-3">Happening now</div>
                <h2 className="font-serif text-4xl font-medium tracking-tight">Clubs reading right now</h2>
              </div>
              <Link href="/clubs" className="btn-ghost">
                See all clubs <IconArrow size={16} />
              </Link>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {clubs.map((c, i) => (
                <Reveal key={c.id} delay={(i % 3) * 100}>
                  <ClubCard club={c} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cities */}
      {cities.length > 0 && (
        <section className="bleed bg-paper py-20">
          <div className="mx-auto max-w-page px-4 text-center">
            <Reveal>
              <div className="eyebrow mb-3">Near you</div>
              <h2 className="font-serif text-4xl font-medium tracking-tight">Readers in your city</h2>
              <p className="mx-auto mt-3 max-w-xl text-muted">Wherever there’s a reading community, there’s a place for it here.</p>
            </Reveal>
            <Reveal delay={100} className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5">
              {cities.map((c) => (
                <Link
                  key={c.city}
                  href={`/cities/${c.city}`}
                  className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50"
                >
                  <IconPin size={15} className="text-rose-600 transition group-hover:scale-110" />
                  {c.name}
                  {c.clubs > 0 && <span className="rounded-full bg-soft px-2 text-xs text-muted">{c.clubs}</span>}
                </Link>
              ))}
              <Link href="/cities" className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-sage-700 hover:underline">
                All cities →
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* Readers and organizers */}
      <section className="bleed bg-paper pb-24 pt-4">
        <div className="mx-auto grid max-w-page gap-5 px-4 md:grid-cols-2">
          <Reveal className="relative h-full overflow-hidden rounded-[2rem] bg-sage-100 p-8 sm:p-10">
            <div className="dots absolute inset-0 opacity-60" aria-hidden />
            <div className="relative">
              <div className="eyebrow mb-3">For readers</div>
              <h3 className="font-serif text-3xl font-medium leading-tight">Find your people. Never get spoiled.</h3>
              <p className="mt-3 max-w-md text-ink/75">Join clubs near you or online, keep your shelves, and talk about every chapter with people reading alongside you. Always free.</p>
              <Link href="/login" className="btn mt-7">Join for free <IconArrow size={16} /></Link>
            </div>
          </Reveal>
          <Reveal delay={120} className="relative h-full overflow-hidden rounded-[2rem] bg-clay-100 p-8 sm:p-10">
            <div className="dots absolute inset-0 opacity-60" aria-hidden />
            <div className="relative">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-clay-700">For organizers</div>
              <h3 className="font-serif text-3xl font-medium leading-tight">Run your club without the chasing.</h3>
              <p className="mt-3 max-w-md text-ink/75">Schedules, polls, RSVPs and reminders in one place. Members get nudges on WhatsApp, so you don’t have to send them.</p>
              <Link href="/clubs/new" className="btn mt-7 bg-clay-700 hover:bg-clay-800">
                Start a club <IconArrow size={16} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
