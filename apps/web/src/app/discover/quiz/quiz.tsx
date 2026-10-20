'use client';

import type { BookSummary, ReaderSignals, ReadingProfile, ReadingProfileInput } from '@bnw/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { FormError } from '@/components/actions';
import { BookPicker } from '@/components/book-picker';
import { IconCheck } from '@/components/icons';
import { GenrePicker, LanguagePicker } from '@/components/profile-fields';
import { BookCover } from '@/components/ui';
import { call, errorMessage } from '@/lib/client-api';
import { plural } from '@/lib/format';

type Answers = Omit<ReadingProfileInput, 'lovedBookIds'> & { lovedBooks: BookSummary[] };

/** One big tappable option. */
function Choice({ on, title, hint, onClick, multi }: { on: boolean; title: string; hint?: string; onClick: () => void; multi?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition duration-200 ${
        on ? 'border-sage-600 bg-sage-50 shadow-sm' : 'border-line bg-surface hover:-translate-y-px hover:border-sage-300'
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border transition ${multi ? 'rounded-md' : 'rounded-full'} ${
          on ? 'border-sage-600 bg-sage-600 text-white' : 'border-line'
        }`}
      >
        {on && <IconCheck className="h-3 w-3" />}
      </span>
      <span>
        <span className={`block font-medium ${on ? 'text-sage-800' : ''}`}>{title}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </button>
  );
}

const LEVELS = [
  { v: 'new', t: "I'm just getting into reading", h: "Haven't read much yet, or not since school" },
  { v: 'occasional', t: 'A few books a year', h: 'I read when something grabs me' },
  { v: 'regular', t: 'About a book a month', h: 'Reading is a regular part of my life' },
  { v: 'avid', t: 'Always have a book on the go', h: 'My to-read pile is taller than I am' },
] as const;

const GOALS = [
  { v: 'club', t: 'Join a book club', h: 'Read along with a group, on a schedule' },
  { v: 'books', t: 'Find good books', h: 'Just tell me what to read next' },
  { v: 'meet_people', t: 'Meet people who read', h: 'Meetups and new friends in my city' },
  { v: 'online_discussion', t: 'Talk about books online', h: 'Discuss at my own time, from anywhere' },
] as const;

const FORMATS = [
  { v: 'in_person', t: 'In person', h: 'Meetups in my city' },
  { v: 'online', t: 'Online', h: 'Video calls and discussion threads' },
  { v: 'either', t: 'Either is fine', h: '' },
] as const;

const PACES = [
  { v: 'relaxed', t: 'Relaxed', h: '1–2 chapters a week' },
  { v: 'steady', t: 'Steady', h: '3–4 chapters a week' },
  { v: 'fast', t: 'Fast', h: '5 or more a week' },
] as const;

const LENGTHS = [
  { v: 'short', t: 'Short', h: 'Under 250 pages' },
  { v: 'medium', t: 'Medium', h: '250–450 pages' },
  { v: 'long', t: 'Long', h: 'The big, immersive ones' },
  { v: 'any', t: "Doesn't matter", h: '' },
] as const;

export function Quiz(props: {
  firstName: string;
  welcome: boolean;
  profile: ReadingProfile | null;
  genres: string[];
  languages: string[];
  signals: ReaderSignals;
}) {
  const router = useRouter();
  const p = props.profile;
  const [a, setA] = useState<Answers>({
    readingLevel: p?.readingLevel ?? (props.signals.booksRead >= 10 ? 'regular' : props.signals.booksRead > 0 ? 'occasional' : 'new'),
    genres: p?.genres ?? props.genres,
    languages: p?.languages.length ? p.languages : props.languages.length ? props.languages : ['en'],
    lovedBooks: p?.lovedBooks ?? [],
    goals: p?.goals ?? [],
    format: p?.format ?? 'either',
    pace: p?.pace ?? 'steady',
    length: p?.length ?? 'any',
  });
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((x) => ({ ...x, [k]: v }));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = props.signals;
  const known = s.booksRead + s.booksReading + s.booksWanted;

  const steps: { title: string; hint?: string; body: ReactNode; ok?: boolean }[] = [
    {
      title: 'How much do you read these days?',
      hint: 'No wrong answers — this helps us pitch our suggestions.',
      body: (
        <div className="grid gap-3">
          {LEVELS.map((l) => (
            <Choice key={l.v} on={a.readingLevel === l.v} title={l.t} hint={l.h} onClick={() => set('readingLevel', l.v)} />
          ))}
        </div>
      ),
    },
    {
      title: 'What kinds of books pull you in?',
      hint: a.readingLevel === 'new' ? "Pick anything that sounds interesting — even if you've only seen the film." : 'Pick as many as you like.',
      body: <GenrePicker value={a.genres} onChange={(v) => set('genres', v)} />,
    },
    {
      title: 'Which languages do you read in?',
      hint: 'We’ll suggest books and clubs in these.',
      body: <LanguagePicker value={a.languages} onChange={(v) => set('languages', v)} />,
      ok: a.languages.length > 0,
    },
    {
      title: a.readingLevel === 'new' ? 'Any book you remember enjoying?' : 'A few books you loved?',
      hint:
        known || s.clubs
          ? `We’ll also use the ${[known ? plural(known, 'book') + ' on your shelves' : null, s.clubs ? `books from your ${plural(s.clubs, 'club')}` : null].filter(Boolean).join(' and ')}. Add any others that stand out.`
          : a.readingLevel === 'new'
            ? 'Even one from school counts. Skip this if nothing comes to mind.'
            : 'Up to 10. These count as read on your shelves.',
      body: (
        <div className="space-y-4">
          <BookPicker
            placeholder="Search by title or author…"
            onPick={(b) => !a.lovedBooks.some((x) => x.id === b.id) && a.lovedBooks.length < 10 && set('lovedBooks', [...a.lovedBooks, b])}
          />
          {a.lovedBooks.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {a.lovedBooks.map((b) => (
                <li key={b.id} className="flex animate-pop-in items-center gap-3 rounded-xl border border-line bg-surface p-2 pr-3">
                  <BookCover book={b} size="sm" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="truncate font-serif">{b.title}</div>
                    <div className="truncate text-xs text-muted">{b.authors[0]}</div>
                  </div>
                  <button
                    type="button"
                    className="text-lg leading-none text-muted hover:text-danger"
                    aria-label={`Remove ${b.title}`}
                    onClick={() => set('lovedBooks', a.lovedBooks.filter((x) => x.id !== b.id))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      title: 'What are you hoping to find here?',
      hint: 'Choose any that apply.',
      body: (
        <div className="grid gap-3 sm:grid-cols-2">
          {GOALS.map((g) => {
            const on = a.goals.includes(g.v);
            return (
              <Choice
                key={g.v}
                multi
                on={on}
                title={g.t}
                hint={g.h}
                onClick={() => set('goals', on ? a.goals.filter((x) => x !== g.v) : [...a.goals, g.v])}
              />
            );
          })}
        </div>
      ),
    },
    {
      title: 'How would you like your club to run?',
      body: (
        <div className="space-y-8">
          <div>
            <div className="label">Where you meet</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {FORMATS.map((f) => (
                <Choice key={f.v} on={a.format === f.v} title={f.t} hint={f.h} onClick={() => set('format', f.v)} />
              ))}
            </div>
          </div>
          <div>
            <div className="label">Reading pace</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {PACES.map((x) => (
                <Choice key={x.v} on={a.pace === x.v} title={x.t} hint={x.h} onClick={() => set('pace', x.v)} />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'And book length?',
      hint: a.readingLevel === 'new' ? 'Shorter books are a great way to build the habit.' : undefined,
      body: (
        <div className="grid gap-3 sm:grid-cols-2">
          {LENGTHS.map((l) => (
            <Choice key={l.v} on={a.length === l.v} title={l.t} hint={l.h} onClick={() => set('length', l.v)} />
          ))}
        </div>
      ),
    },
  ];
  const last = step === steps.length - 1;
  const current = steps[step];

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const { lovedBooks, ...rest } = a;
      await call('/v1/me/reading-profile', { method: 'PUT', body: { ...rest, lovedBookIds: lovedBooks.map((b) => b.id) } });
      router.push('/discover?fresh=1');
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="eyebrow mb-1">{props.welcome ? `Welcome, ${props.firstName}` : 'Get matched'}</div>
          <div className="text-sm text-muted">
            Question {step + 1} of {steps.length}
          </div>
        </div>
        <Link href={props.welcome ? '/home' : '/discover'} className="text-sm text-muted hover:text-ink">
          {props.welcome ? 'Skip for now' : 'Cancel'}
        </Link>
      </div>

      <div className="mb-10 flex gap-1.5" aria-hidden>
        {steps.map((_, i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sage-50">
            <div className={`h-full rounded-full bg-sage-600 transition-all duration-500 ${i <= step ? 'w-full' : 'w-0'}`} />
          </div>
        ))}
      </div>

      <div key={step} className="animate-fade-up">
        <h1 className="h1 mb-2">{current.title}</h1>
        {current.hint && <p className="mb-8 text-muted">{current.hint}</p>}
        {!current.hint && <div className="mb-8" />}
        {current.body}
      </div>

      <FormError error={error} />
      <div className="mt-12 flex items-center gap-3 border-t border-line pt-6">
        {step > 0 && (
          <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        <div className="ml-auto flex items-center gap-4">
          {step === 3 && !a.lovedBooks.length && !last && (
            <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setStep(step + 1)}>
              Skip
            </button>
          )}
          <button
            type="button"
            className="btn px-8"
            disabled={busy || current.ok === false}
            onClick={() => (last ? finish() : setStep(step + 1))}
          >
            {last ? (busy ? 'Finding your matches…' : 'Show my matches') : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
