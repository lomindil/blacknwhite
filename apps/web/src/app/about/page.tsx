import type { Metadata } from 'next';
import Link from 'next/link';
import { IconArrow, IconBook, IconCalendar, IconChat, IconCheck, IconLanguage, IconLock, IconShield, IconUsers, IconVote } from '@/components/icons';
import { Reveal } from '@/components/reveal';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'About us',
  description: `${BRAND.name} is a home for book clubs across India — for organizers, readers and the bookstores that bring them together.`,
};

const BELIEFS = [
  {
    icon: <IconUsers size={22} />,
    tone: 'bg-sage-100 text-sage-700',
    title: 'Reading is better together',
    body: 'A book you discuss stays with you longer. We build for the conversation, not the count of books on a shelf.',
  },
  {
    icon: <IconLock size={22} />,
    tone: 'bg-plum-100 text-plum-700',
    title: 'Spoilers are sacred',
    body: 'Everyone reads at their own pace. Discussions open chapter by chapter, so nobody has the ending ruined.',
  },
  {
    icon: <IconLanguage size={22} />,
    tone: 'bg-rose-100 text-rose-700',
    title: 'Every city, every language',
    body: 'Wherever there’s a reading community, there’s a place for it here — in English, Hindi, Tamil, Bengali, Kannada and more.',
  },
  {
    icon: <IconShield size={22} />,
    tone: 'bg-sky-100 text-sky-700',
    title: 'Private by default',
    body: 'We never store where you are, only your city. Your data stays in India, and you can export or delete it any time.',
  },
  {
    icon: <IconCalendar size={22} />,
    tone: 'bg-clay-100 text-clay-700',
    title: 'Organizers come first',
    body: 'Every club starts with someone who brings people together. Our job is to give them their evenings back.',
  },
];

const OFFER = [
  { icon: <IconUsers size={18} />, text: 'Start a club or join one near you' },
  { icon: <IconVote size={18} />, text: 'Vote on what to read next' },
  { icon: <IconBook size={18} />, text: 'Read on a weekly schedule and track progress' },
  { icon: <IconChat size={18} />, text: 'Talk it through — without spoilers' },
  { icon: <IconCalendar size={18} />, text: 'Schedule meetups, online or in person' },
];

export default function AboutPage() {
  return (
    <div className="-mb-8 sm:-mb-12">
      {/* Mission */}
      <section className="bleed relative -mt-8 overflow-hidden bg-gradient-to-b from-sage-100 via-sage-50 to-paper sm:-mt-12">
        <div className="dots absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-page items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="eyebrow mb-4 animate-fade-up">About us</div>
            <h1 className="animate-fade-up font-serif text-4xl font-medium leading-[1.08] tracking-tight [animation-delay:100ms] sm:text-6xl">
              We’re building India’s home for reading together.
            </h1>
            <p className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-muted [animation-delay:200ms]">
              {BRAND.name} gives book clubs everything they need in one place — from picking the next book to the last chapter’s
              discussion — and helps readers find their people, in their city and their language.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md animate-pop-in [animation-delay:200ms]">
            <div className="overflow-hidden rounded-[2rem] shadow-lift">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/landing/place-library.jpg" alt="Readers gathered in a cosy community library" className="aspect-[4/3] w-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-4 w-[45%] -rotate-[4deg] overflow-hidden rounded-2xl border-[5px] border-white shadow-lift">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/landing/hero-reader.jpg" alt="A reader in a red kurta reading in a cane chair" className="aspect-[4/5] w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="bleed bg-surface py-20">
        <div className="mx-auto grid max-w-page gap-12 px-4 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <div className="eyebrow mb-3">Our story</div>
            <h2 className="font-serif text-4xl font-medium leading-tight tracking-tight">Book clubs deserved better than a WhatsApp group</h2>
          </Reveal>
          <Reveal delay={100} className="space-y-5 text-lg leading-relaxed text-ink/85">
            <p>
              Across India, book clubs are thriving — in living rooms, cafés, college campuses and independent bookstores. But most of them run
              on a patchwork: a WhatsApp group for chat, Instagram for announcements, a Meet link for virtual sessions, and someone chasing
              RSVPs by hand.
            </p>
            <p>
              Spoilers slip into the group chat. Late joiners can’t find old discussions. Organizers spend their evenings on admin instead of
              reading. And the global apps built for tracking books don’t know our cities, our bookstores or our languages.
            </p>
            <p>
              So we’re building the place we wanted for our own clubs: one home for the whole life of a club, designed for India from day one.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Beliefs */}
      <section className="bleed border-y border-line/70 bg-paper py-20">
        <div className="mx-auto max-w-page px-4">
          <Reveal className="mb-12 text-center">
            <div className="eyebrow mb-3">What we believe</div>
            <h2 className="font-serif text-4xl font-medium tracking-tight">The principles we build by</h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BELIEFS.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 100} className="card card-hover h-full">
                <span className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${b.tone}`}>{b.icon}</span>
                <h3 className="font-serif text-xl font-medium">{b.title}</h3>
                <p className="mt-2 text-muted">{b.body}</p>
              </Reveal>
            ))}
            <Reveal delay={200} className="relative h-full overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/landing/card-organizers.jpg" alt="Club members reading and taking notes together" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
              <p className="absolute inset-x-0 bottom-0 p-5 font-serif text-lg text-white">“Read together. Meet up. Talk books.”</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section className="bleed bg-surface py-20">
        <div className="mx-auto grid max-w-page items-center gap-12 px-4 lg:grid-cols-2">
          <Reveal>
            <div className="eyebrow mb-3">What you can do here</div>
            <h2 className="font-serif text-4xl font-medium leading-tight tracking-tight">Everything a club needs — and a few things it never had</h2>
            <ul className="mt-8 space-y-3">
              {OFFER.map((o) => (
                <li key={o.text} className="flex items-center gap-3 text-lg">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-50 text-sage-700">{o.icon}</span>
                  {o.text}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-muted">
              Plus city pages for local events and bookstores, Goodreads and StoryGraph import, WhatsApp reminders, a community blog, and
              prices across stores when it’s time to buy.
            </p>
          </Reveal>
          <Reveal delay={100} className="card bg-sage-50/60">
            <div className="eyebrow mb-3">Free for readers</div>
            <p className="font-serif text-2xl leading-snug">Readers never pay to join a club.</p>
            <p className="mt-3 text-muted">
              Organizers and bookstores will be able to choose paid tools later — ticketing, featured listings and more — which is how we keep the
              lights on without selling anyone’s data.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {['No ads inside discussions', 'Your data stays in India', 'Export or delete your account any time'].map((t) => (
                <li key={t} className="flex items-center gap-2"><IconCheck size={16} className="text-sage-600" /> {t}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Contact */}
      <section className="bleed border-t border-line/70 bg-paper py-20">
        <div className="mx-auto grid max-w-page gap-6 px-4 md:grid-cols-3">
          {[
            { title: 'Say hello', body: 'Questions, ideas, or want to bring your club over?', contact: 'hello@[domain]' },
            { title: 'Bookstores and publishers', body: 'List your store, host events, or partner with clubs.', contact: 'partners@[domain]' },
            { title: 'Grievances', body: 'Report content or raise a concern with our grievance officer.', contact: 'grievance@[domain]' },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 100} className="card">
              <h3 className="font-serif text-lg font-medium">{c.title}</h3>
              <p className="mt-1 text-sm text-muted">{c.body}</p>
              <p className="mt-3 text-sm font-medium text-sage-700">{c.contact}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mx-auto mt-14 max-w-xl px-4 text-center">
          <h2 className="font-serif text-3xl font-medium">Your next chapter starts with a club</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/clubs" className="btn">Find a club <IconArrow size={16} /></Link>
            <Link href="/clubs/new" className="btn-ghost">Start one</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
