import Link from 'next/link';
import { IconArrow } from '@/components/icons';
import { RedMascot } from '@/components/mascot';
import { Reveal } from '@/components/reveal';
import { BRAND } from '@/lib/brand';

const HABITS = ['Nudges you when the next chapter opens', 'Finds clubs and books that suit you', 'Never, ever spoils an ending'];

/** Introduces the mascot. One of the few places russet is used as a background, and only its palest tint. */
export function MeetRed({ href, cta }: { href: string; cta: string }) {
  return (
    <Reveal className="relative overflow-hidden rounded-[2rem] border border-russet-100 bg-russet-50">
      <div className="dots absolute inset-0 opacity-50" aria-hidden />
      <div className="relative grid items-center gap-8 p-8 sm:p-12 md:grid-cols-[auto_1fr]">
        <div className="mx-auto md:mx-0">
          <RedMascot size={220} className="animate-float-slow drop-shadow-sm" title={`${BRAND.mascot}, the ${BRAND.name} red panda, reading a book`} />
        </div>
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-russet-700">Meet {BRAND.mascot}</div>
          <h2 className="font-serif text-3xl font-medium leading-tight tracking-tight sm:text-4xl">Your reading companion</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-ink/75">
            {BRAND.mascot} is a red panda — and like the real ones, happiest curled up somewhere quiet with a good book and time to spare.
            You&apos;ll find {BRAND.mascot} all over {BRAND.name}, keeping your club on track and your next read close at hand.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-ink/80">
            {HABITS.map((h) => (
              <li key={h} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-russet-500" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
          <Link href={href} className="btn mt-7">
            {cta} <IconArrow size={16} />
          </Link>
        </div>
      </div>
    </Reveal>
  );
}
