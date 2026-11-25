import type { ReactNode } from 'react';
import { BRAND } from '@/lib/brand';

/**
 * Red, our mascot: a red panda reading a book. Russet fur, white face markings,
 * dark legs and a ringed tail, holding a sage-green book.
 */
export function RedMascot({ size = 160, className = '', title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* tail, curling up behind on the right, with rings */}
      <path d="M150 178c38 4 58-22 52-52-4-22-22-34-38-30 14 8 20 22 16 36-4 16-20 26-40 24z" fill="#B9532F"/>
      <path d="M196 146c-3 9-9 17-17 22l-7-8c7-4 12-10 14-17z" fill="#F0C3B0"/>
      <path d="M199 118c1 7 1 13-1 19l-10-1c2-5 2-10 1-15z" fill="#F0C3B0"/>
      <path d="M184 98c5 3 9 8 11 13l-9 5c-2-4-4-7-8-10z" fill="#F0C3B0"/>
      {/* body */}
      <ellipse cx="108" cy="160" rx="50" ry="44" fill="#B9532F"/>
      <ellipse cx="108" cy="176" rx="34" ry="26" fill="#4A2418"/>
      {/* feet */}
      <ellipse cx="80" cy="200" rx="17" ry="9" fill="#3A1C12"/>
      <ellipse cx="136" cy="200" rx="17" ry="9" fill="#3A1C12"/>
      {/* ears: russet outside, white rim, dark centre */}
      <path d="M48 66c-6-24 3-42 21-47 12 9 17 23 15 36z" fill="#C65C35"/>
      <path d="M54 61c-4-17 3-30 15-34 8 7 11 17 10 26z" fill="#FBF3EA"/>
      <path d="M59 57c-2-11 2-20 10-23 5 5 7 12 6 18z" fill="#7A2E18"/>
      <path d="M168 66c6-24-3-42-21-47-12 9-17 23-15 36z" fill="#C65C35"/>
      <path d="M162 61c4-17-3-30-15-34-8 7-11 17-10 26z" fill="#FBF3EA"/>
      <path d="M157 57c2-11-2-20-10-23-5 5-7 12-6 18z" fill="#7A2E18"/>
      {/* head */}
      <ellipse cx="108" cy="86" rx="56" ry="46" fill="#C65C35"/>
      {/* white face markings */}
      <ellipse cx="108" cy="106" rx="24" ry="18" fill="#FBF3EA"/>
      <ellipse cx="66" cy="98" rx="15" ry="13" fill="#FBF3EA"/>
      <ellipse cx="150" cy="98" rx="15" ry="13" fill="#FBF3EA"/>
      <ellipse cx="84" cy="66" rx="10" ry="6" fill="#FBF3EA" transform="rotate(-12 84 66)"/>
      <ellipse cx="132" cy="66" rx="10" ry="6" fill="#FBF3EA" transform="rotate(12 132 66)"/>
      {/* tear marks */}
      <path d="M84 91c1 6 3 11 7 15" stroke="#8A3519" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
      <path d="M132 91c-1 6-3 11-7 15" stroke="#8A3519" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
      {/* eyes, looking down at the book */}
      <ellipse cx="86" cy="84" rx="6.5" ry="7.5" fill="#2A1610"/>
      <ellipse cx="130" cy="84" rx="6.5" ry="7.5" fill="#2A1610"/>
      <circle cx="88" cy="81" r="2" fill="#FFF"/>
      <circle cx="132" cy="81" r="2" fill="#FFF"/>
      {/* nose and smile */}
      <path d="M100 98h16c0 5-4 9-8 9s-8-4-8-9z" fill="#2A1610"/>
      <path d="M100 113c4 4 12 4 16 0" stroke="#2A1610" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* open book held up */}
      <path d="M60 140c16-6 32-5 48 4v34c-16-8-32-9-48-4z" fill="#3D5A4C"/>
      <path d="M156 140c-16-6-32-5-48 4v34c16-8 32-9 48-4z" fill="#3D5A4C"/>
      <path d="M64 141c14-4 28-3 44 5v29c-15-7-29-8-44-4z" fill="#FBF8F1"/>
      <path d="M152 141c-14-4-28-3-44 5v29c15-7 29-8 44-4z" fill="#F1ECE3"/>
      <path d="M72 152c10-2 20-1 29 3M72 160c10-2 20-1 29 3M115 155c9-4 19-5 29-3M115 163c9-4 19-5 29-3" stroke="#C9C1B3" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* paws on the book */}
      <ellipse cx="62" cy="160" rx="10" ry="12" fill="#3A1C12"/>
      <ellipse cx="154" cy="160" rx="10" ry="12" fill="#3A1C12"/>
    </svg>
  );
}

/** Red with a speech bubble, for welcomes and tips. Used sparingly. */
export function RedSays({ children, size = 72, className = '' }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      <RedMascot size={size} className="shrink-0" title={`${BRAND.mascot} the red panda`} />
      <div className="mb-3 rounded-2xl rounded-bl-md border border-russet-100 bg-russet-50 px-4 py-2.5 text-sm text-ink/85">{children}</div>
    </div>
  );
}
