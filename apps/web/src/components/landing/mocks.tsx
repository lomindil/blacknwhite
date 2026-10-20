// Illustrative mini-UIs for the landing page. Pure presentation; `active` starts their animations.
import { BookCover } from '@/components/ui';
import { IconBell, IconCheck, IconLock, IconPin } from '@/components/icons';

const faces = [
  { n: 'AS', c: 'bg-clay-100 text-clay-700' },
  { n: 'RK', c: 'bg-sky-100 text-sky-700' },
  { n: 'NP', c: 'bg-ochre-100 text-ochre-700' },
  { n: 'TM', c: 'bg-plum-100 text-plum-700' },
];

export function Faces({ extra }: { extra?: string }) {
  return (
    <div className="flex items-center">
      {faces.map((f, i) => (
        <span key={f.n} className={`-ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold first:ml-0 ${f.c}`} style={{ zIndex: 10 - i }}>
          {f.n}
        </span>
      ))}
      {extra && <span className="ml-2 text-xs text-muted">{extra}</span>}
    </div>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/80 bg-white p-4 shadow-card ${className}`}>{children}</div>;
}

/** Animated bar: grows to `pct` when active. */
function Bar({ pct, active, tone, delay = 0 }: { pct: number; active: boolean; tone: string; delay?: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-black/5">
      <div className={`h-full rounded-full ${tone} transition-[width] duration-1000 ease-out`} style={{ width: active ? `${pct}%` : '0%', transitionDelay: `${delay}ms` }} />
    </div>
  );
}

export function ClubsMock({ active }: { active: boolean }) {
  const clubs = [
    { name: 'Sunday Fiction Circle', meta: 'Kochi · English · 24 members', book: 'Chemmeen', joined: true },
    { name: 'Hindi Kahani Manch', meta: 'Lucknow · Hindi · 41 members', book: 'Godaan' },
    { name: 'Sci-Fi After Dark', meta: 'Online · English · 63 members', book: 'Klara and the Sun' },
  ];
  return (
    <div className="space-y-3">
      {clubs.map((c, i) => (
        <Panel key={c.name} className={`flex items-center gap-3 transition-all duration-700 ${active ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`}>
          <BookCover book={{ title: c.book, authors: [''], coverUrl: null }} size="sm" />
          <div className="min-w-0 flex-1" style={{ transitionDelay: `${i * 120}ms` }}>
            <div className="truncate font-serif text-[15px]">{c.name}</div>
            <div className="truncate text-xs text-muted">{c.meta}</div>
            <div className="mt-1.5"><Faces /></div>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${c.joined ? 'bg-sage-50 text-sage-700' : 'bg-sage-700 text-white'}`}>{c.joined ? '✓ Joined' : 'Join'}</span>
        </Panel>
      ))}
    </div>
  );
}

export function VoteMock({ active }: { active: boolean }) {
  const opts = [
    { t: 'Tomb of Sand', pct: 52 },
    { t: 'Heart Lamp', pct: 31, mine: true },
    { t: 'The Inheritance of Loss', pct: 17 },
  ];
  return (
    <Panel className="p-5">
      <div className="mb-1 font-serif text-lg">What should we read next?</div>
      <div className="mb-4 text-xs text-muted">23 votes · closes Friday</div>
      <div className="space-y-3">
        {opts.map((o, i) => (
          <div key={o.t} className={`rounded-xl border p-3 ${o.mine ? 'border-ochre-300 bg-ochre-50' : 'border-line'}`}>
            <div className="mb-2 flex justify-between text-sm">
              <span>{o.mine && '✓ '}{o.t}</span>
              <span className="text-muted">{active ? o.pct : 0}%</span>
            </div>
            <Bar pct={o.pct} active={active} tone="bg-ochre-300" delay={i * 150} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function TrackMock({ active }: { active: boolean }) {
  const weeks = [
    { w: 1, ch: '1–4', done: true },
    { w: 2, ch: '5–8', done: true },
    { w: 3, ch: '9–12', now: true },
    { w: 4, ch: '13–16' },
  ];
  return (
    <div className="space-y-3">
      <Panel className="flex items-center gap-4">
        <BookCover book={{ title: 'The God of Small Things', authors: ['Arundhati Roy'], coverUrl: null }} size="sm" />
        <div className="flex-1">
          <div className="text-xs text-muted">Finished chapter 10 of 21</div>
          <div className="my-2"><Bar pct={48} active={active} tone="bg-sky-600" /></div>
          <div className="flex gap-1.5 text-[11px]">
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">Reading</span>
            <span className="rounded-full bg-soft px-2 py-0.5 text-muted">★★★★☆ last read</span>
          </div>
        </div>
      </Panel>
      <Panel className="p-3">
        {weeks.map((w, i) => (
          <div
            key={w.w}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-500 ${w.now ? 'bg-sky-50 font-medium text-sky-800' : ''} ${active ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <span>Week {w.w} · chapters {w.ch}</span>
            {w.done ? <IconCheck size={16} className="text-sage-600" /> : w.now ? <span className="text-xs">This week</span> : <span className="text-xs text-muted">Next</span>}
          </div>
        ))}
      </Panel>
    </div>
  );
}

export function ChatMock({ active }: { active: boolean }) {
  return (
    <div className="space-y-3">
      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-serif">Week 2 · Chapters 5–8</span>
          <span className="rounded-full bg-plum-50 px-2 py-0.5 text-[11px] text-plum-700">Spoilers up to ch. 8</span>
        </div>
        <div className={`space-y-2.5 text-sm transition-all duration-700 ${active ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex gap-2"><span className="h-6 w-6 shrink-0 rounded-full bg-clay-100" /><p className="rounded-2xl rounded-tl-md bg-soft px-3 py-2">Baby Kochamma is quietly terrifying.</p></div>
          <div className="flex gap-2"><span className="h-6 w-6 shrink-0 rounded-full bg-sky-100" /><p className="rounded-2xl rounded-tl-md bg-soft px-3 py-2">And that line — <span className="rounded bg-plum-200 px-1 text-transparent">things can change in a day</span></p></div>
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-plum-200 px-3 py-2 text-xs text-plum-700"><IconLock size={14} /> A reply about chapter 18 — unlocks when you get there</div>
        </div>
      </Panel>
      <Panel className={`ml-auto w-4/5 transition-all delay-300 duration-700 ${active ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
        <div className="mb-1 text-[11px] text-muted">Message · Sunday Fiction Circle</div>
        <p className="rounded-2xl rounded-br-md bg-sage-700 px-3 py-2 text-sm text-white">Want to swap copies at the meetup?</p>
      </Panel>
    </div>
  );
}

export function MeetMock({ active }: { active: boolean }) {
  return (
    <div className="space-y-3">
      <Panel className="p-5">
        <div className="flex gap-4">
          <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-clay-50 py-1.5 text-clay-700 ring-1 ring-clay-100">
            <span className="text-[10px] font-semibold tracking-widest">NOV</span>
            <span className="font-serif text-2xl leading-none">09</span>
          </div>
          <div>
            <div className="font-serif text-lg leading-snug">Week 3 meetup: chapters 9–12</div>
            <div className="text-sm text-muted">Sat, 5:00 pm · Café Mocha, Indiranagar</div>
            <div className="mt-2"><Faces extra="8 going · 4 spots left" /></div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <span className="rounded-full bg-sage-700 py-1.5 text-center font-medium text-white">Going</span>
          <span className="rounded-full border border-line py-1.5 text-center">Maybe</span>
          <span className="rounded-full border border-line py-1.5 text-center">Can't go</span>
        </div>
      </Panel>
      <Panel className={`flex items-center gap-3 transition-all delay-500 duration-700 ${active ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-50 text-sage-700"><IconBell size={18} /></span>
        <div className="text-sm">
          <div className="font-medium">Reminder sent on WhatsApp</div>
          <div className="text-xs text-muted">Tomorrow, 5:00 pm · calendar invite attached</div>
        </div>
      </Panel>
    </div>
  );
}

export function LocalMock({ active }: { active: boolean }) {
  const scripts = [
    { s: 'हिन्दी', c: 'bg-clay-50 text-clay-700' },
    { s: 'বাংলা', c: 'bg-sky-50 text-sky-700' },
    { s: 'தமிழ்', c: 'bg-ochre-50 text-ochre-700' },
    { s: 'ಕನ್ನಡ', c: 'bg-plum-50 text-plum-700' },
    { s: 'മലയാളം', c: 'bg-sage-50 text-sage-700' },
    { s: 'मराठी', c: 'bg-rose-50 text-rose-700' },
  ];
  return (
    <div className="space-y-3">
      <Panel className="p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Read in your language</div>
        <div className="grid grid-cols-3 gap-2">
          {scripts.map((x, i) => (
            <span
              key={x.s}
              className={`rounded-xl py-3 text-center text-lg transition-all duration-500 ${x.c} ${active ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {x.s}
            </span>
          ))}
        </div>
      </Panel>
      <Panel className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700"><IconPin size={18} /></span>
        <div className="flex-1 text-sm">
          <div className="font-medium">Near you in Pune</div>
          <div className="text-xs text-muted">6 clubs · 3 bookstores · silent reading this Sunday</div>
        </div>
      </Panel>
    </div>
  );
}

export function ShelvesMock({ active }: { active: boolean }) {
  return (
    <div className="space-y-3">
      <Panel>
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium">Importing from Goodreads</span>
          <span className="text-muted">{active ? '412' : '0'} / 412 books</span>
        </div>
        <Bar pct={100} active={active} tone="bg-sage-600" />
        <div className="mt-2 text-xs text-muted">Shelves, ratings and dates carried over</div>
      </Panel>
      <Panel>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Buy Sea of Poppies</div>
        {[
          { s: 'Amazon India', p: '₹349', best: true },
          { s: 'Flipkart', p: '₹379' },
          { s: 'Partner bookstore', p: '₹399' },
        ].map((r, i) => (
          <div
            key={r.s}
            className={`mb-2 flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all duration-500 last:mb-0 ${r.best ? 'border-sage-200 bg-sage-50' : 'border-line'} ${active ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: `${300 + i * 120}ms` }}
          >
            <span>{r.s}</span>
            <span className="font-medium">{r.p}{r.best && <span className="ml-2 rounded-full bg-sage-700 px-2 py-0.5 text-[10px] text-white">Best</span>}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

export function SafetyMock({ active }: { active: boolean }) {
  const items = [
    'Only your city is stored — never your location',
    'Messages only between people in the same club',
    'Reader counts under 5 show as “a few readers”',
    'Block and report from anywhere',
    'Export or delete your data any time',
  ];
  return (
    <Panel className="p-5">
      <ul className="space-y-2.5">
        {items.map((t, i) => (
          <li
            key={t}
            className={`flex items-start gap-3 text-sm transition-all duration-500 ${active ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'}`}
            style={{ transitionDelay: `${i * 110}ms` }}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-plum-50 text-plum-700"><IconCheck size={13} /></span>
            {t}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
