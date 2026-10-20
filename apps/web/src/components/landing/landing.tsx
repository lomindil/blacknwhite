import type { ClubSummary } from '@bnw/shared';
import Link from 'next/link';
import { IconArrow, IconCalendar, IconCheck, IconPin, IconVote } from '@/components/icons';
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

function Hero({ signedIn }: { signedIn: boolean }) {
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
            <Link href={signedIn ? '/home' : '/login'} className="btn px-7 py-3 text-base">
              {signedIn ? 'Go to your home' : 'Get started — it’s free'} <IconArrow size={18} />
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

/** Real readers first, with small product moments floating around them. */
function HeroCollage() {
  return (
    <div className="relative mx-auto h-[460px] w-full max-w-[520px] animate-pop-in [animation-delay:250ms] sm:h-[540px]">
      {/* main photo */}
      <div className="absolute right-0 top-0 h-[82%] w-[80%] overflow-hidden rounded-[2rem] shadow-lift">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/landing/hero-cafe.jpg" alt="Friends talking over books and snacks at a café table" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" aria-hidden />
      </div>
      {/* inset photo */}
      <div className="absolute bottom-[4%] left-0 h-[42%] w-[36%] -rotate-[5deg] overflow-hidden rounded-3xl border-[5px] border-white shadow-lift transition-transform duration-500 hover:rotate-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/landing/hero-reader.jpg" alt="A reader in a red kurta reading in a cane chair" className="h-full w-full object-cover" />
      </div>

      <div aria-hidden>
        {/* this week's reading — compact */}
        <div className="absolute bottom-0 right-[-2%] w-[58%] animate-float sm:right-[-4%]">
          <div className="flex items-center gap-3 rounded-2xl border border-white bg-white/95 p-3 shadow-lift backdrop-blur">
            <BookCover book={{ title: 'The God of Small Things', authors: ['Arundhati Roy'], coverUrl: null }} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">Sunday Fiction Circle</div>
              <div className="text-[11px] text-muted">This week · chapters 9–12</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sky-50">
                <div className="h-full w-[62%] rounded-full bg-sky-600" />
              </div>
              <div className="mt-1.5"><Faces extra="+20" /></div>
            </div>
          </div>
        </div>
        {/* chips */}
        <div className="absolute left-[4%] top-[8%] animate-float [animation-delay:-2.5s]">
          <div className="rounded-2xl rounded-bl-md bg-sage-700 px-3.5 py-2 text-xs text-white shadow-lift">That ending of chapter 10 😮</div>
        </div>
        <div className="absolute left-[2%] top-[42%] animate-float [animation-delay:-1s]">
          <div className="flex items-center gap-2.5 rounded-2xl border border-white bg-white/95 px-3.5 py-2.5 shadow-lift">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ochre-100 text-ochre-700"><IconVote size={16} /></span>
            <div className="text-xs">
              <div className="font-medium">Next read: Tomb of Sand</div>
              <div className="text-muted">won with 12 votes</div>
            </div>
          </div>
        </div>
        <div className="absolute right-[-2%] top-[6%] animate-float [animation-delay:-3.5s] sm:right-[-5%]">
          <div className="flex items-center gap-2.5 rounded-2xl border border-white bg-white/95 px-3.5 py-2.5 shadow-lift">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-clay-100 text-clay-700"><IconCalendar size={16} /></span>
            <div className="text-xs">
              <div className="font-medium">Meetup · Sat, 5 pm</div>
              <div className="text-muted">8 going</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PLACES = [
  { img: 'place-livingroom', title: 'Living rooms', note: 'Friends who read together', alt: 'Three friends laughing over a book on a sofa', span: 'col-span-2 row-span-2 md:col-span-1' },
  { img: 'place-park', title: 'Parks and campuses', note: 'Sunday reads in the open', alt: 'Two friends reading together outdoors', span: 'col-span-2 md:col-span-2' },
  { img: 'place-bookstore', title: 'Bookstores', note: 'Your local indie, between the shelves', alt: 'A reader browsing tall shelves in a crowded bookstore', span: 'col-span-1 row-span-2 md:col-span-1' },
  { img: 'place-library', title: 'Libraries', note: 'Community spaces and reading rooms', alt: 'People reading in a cosy community library', span: 'col-span-1 md:col-span-1' },
  { img: 'place-steps', title: 'Anywhere, really', note: 'Online, offline, or both', alt: 'A group of friends reading together on wooden steps', span: 'col-span-1 md:col-span-1' },
];

/** Photo grid: book clubs are people and places first. */
function Places() {
  return (
    <section className="bleed bg-surface pb-20 pt-6 sm:pb-24">
      <div className="mx-auto max-w-page px-4">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <div className="eyebrow mb-3">Book clubs happen everywhere</div>
          <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">Wherever readers gather, there’s a club</h2>
          <p className="mt-4 text-lg text-muted">In living rooms and cafés, parks and bookstores — in person or online. We give every club a home.</p>
        </Reveal>
        <div className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] md:grid-cols-4 md:gap-4">
          {PLACES.map((p, i) => (
            <Reveal key={p.img} delay={i * 90} className={`group relative overflow-hidden rounded-3xl ${p.span}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/images/landing/${p.img}.jpg`} alt={p.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                <div className="font-serif text-lg font-medium leading-tight sm:text-xl">{p.title}</div>
                <div className="mt-0.5 text-xs text-white/85 transition-all duration-500 sm:text-sm sm:opacity-0 sm:group-hover:opacity-100">{p.note}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
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

export function Landing({ clubs, cities, signedIn = false }: { clubs: ClubSummary[]; cities: { city: string; name: string; clubs: number }[]; signedIn?: boolean }) {
  return (
    <div className="-mb-8 sm:-mb-12">
      <Hero signedIn={signedIn} />
      <Places />

      {/* Features */}
      <section className="bleed border-t border-line/70 bg-paper py-20 sm:py-28">
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
      <section className="bleed border-y border-line/70 bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-page px-4">
          <Reveal className="mb-14 text-center">
            <div className="eyebrow mb-3">How it works</div>
            <h2 className="font-serif text-4xl font-medium tracking-tight">Three steps to your next great read</h2>
          </Reveal>
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            <div className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-line md:block" aria-hidden />
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 150} className="relative text-center">
                <span className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-full font-serif text-2xl ring-8 ring-surface ${s.tone}`}>{s.n}</span>
                <h3 className="mt-5 font-serif text-xl font-medium">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-muted">{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Clubs */}
      {clubs.length > 0 && (
        <section className="bleed bg-paper py-20 sm:py-24">
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
        <section className="bleed border-t border-line/70 bg-surface py-20">
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
      <section className="bleed bg-surface pb-24 pt-4">
        <div className="mx-auto grid max-w-page gap-5 px-4 lg:grid-cols-2">
          {[
            {
              img: 'card-readers',
              alt: 'Two friends reading by a sunny window',
              bg: 'bg-sage-100',
              eyebrow: 'For readers',
              eyebrowClass: 'text-sage-700',
              title: 'Find your people. Never get spoiled.',
              body: 'Join clubs near you or online, keep your shelves, and talk about every chapter with people reading alongside you. Always free.',
              cta: { href: '/login', label: 'Join for free', cls: 'btn' },
            },
            {
              img: 'card-organizers',
              alt: 'Club members reading and taking notes at a picnic table',
              bg: 'bg-clay-100',
              eyebrow: 'For organizers',
              eyebrowClass: 'text-clay-700',
              title: 'Run your club without the chasing.',
              body: 'Schedules, polls, RSVPs and reminders in one place. Members get nudges on WhatsApp, so you don’t have to send them.',
              cta: { href: '/clubs/new', label: 'Start a club', cls: 'btn bg-clay-700 hover:bg-clay-800' },
            },
          ].map((c, i) => (
            <Reveal key={c.img} delay={i * 120} className={`group relative grid h-full overflow-hidden rounded-[2rem] sm:grid-cols-[1.15fr_1fr] ${c.bg}`}>
              <div className="relative p-8 sm:p-10">
                <div className="dots absolute inset-0 opacity-60" aria-hidden />
                <div className="relative">
                  <div className={`mb-3 text-xs font-semibold uppercase tracking-[0.16em] ${c.eyebrowClass}`}>{c.eyebrow}</div>
                  <h3 className="font-serif text-3xl font-medium leading-tight">{c.title}</h3>
                  <p className="mt-3 text-ink/75">{c.body}</p>
                  <Link href={c.cta.href} className={`${c.cta.cls} mt-7`}>
                    {c.cta.label} <IconArrow size={16} />
                  </Link>
                </div>
              </div>
              <div className="relative min-h-[220px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/landing/${c.img}.jpg`} alt={c.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
