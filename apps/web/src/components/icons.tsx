// Small stroke icon set (24×24, currentColor). Kept local to avoid an icon dependency.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

export const IconUsers = (p: P) => (
  <Icon {...p}><path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" /><circle cx="10" cy="7.5" r="3.5" /><path d="M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.2a3.5 3.5 0 0 1 0 6.6" /></Icon>
);
export const IconVote = (p: P) => (
  <Icon {...p}><path d="M4 20h16" /><rect x="5" y="11" width="3.5" height="6" rx="1" /><rect x="10.25" y="6" width="3.5" height="11" rx="1" /><rect x="15.5" y="9" width="3.5" height="8" rx="1" /></Icon>
);
export const IconProgress = (p: P) => (
  <Icon {...p}><path d="M4 19.5V5a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 22h12" /><path d="m9 10 2 2 4-4" /></Icon>
);
export const IconChat = (p: P) => (
  <Icon {...p}><path d="M20 12a7.5 7.5 0 0 1-11.2 6.5L4 20l1.5-4.3A7.5 7.5 0 1 1 20 12Z" /><path d="M9 11h6M9 14h3.5" /></Icon>
);
export const IconCalendar = (p: P) => (
  <Icon {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.2" fill="currentColor" /></Icon>
);
export const IconPin = (p: P) => (
  <Icon {...p}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></Icon>
);
export const IconImport = (p: P) => (
  <Icon {...p}><path d="M12 3v11m0 0-4-4m4 4 4-4" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></Icon>
);
export const IconShield = (p: P) => (
  <Icon {...p}><path d="M12 3 5 6v5.5c0 4.3 3 8 7 9.5 4-1.5 7-5.2 7-9.5V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></Icon>
);
export const IconLock = (p: P) => (
  <Icon {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /></Icon>
);
export const IconBell = (p: P) => (
  <Icon {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></Icon>
);
export const IconCheck = (p: P) => (
  <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>
);
export const IconArrow = (p: P) => (
  <Icon {...p}><path d="M5 12h14m-5-5 5 5-5 5" /></Icon>
);
export const IconChevron = ({ dir = 'right', ...p }: P & { dir?: 'left' | 'right' }) => (
  <Icon {...p}><path d={dir === 'right' ? 'm9 5 7 7-7 7' : 'm15 5-7 7 7 7'} /></Icon>
);
export const IconBook = (p: P) => (
  <Icon {...p}><path d="M12 6.5C10 5 7 4.5 4 5.2v13c3-.7 6-.2 8 1.3 2-1.5 5-2 8-1.3v-13c-3-.7-6-.2-8 1.3Z" /><path d="M12 6.5v13" /></Icon>
);
export const IconLanguage = (p: P) => (
  <Icon {...p}><path d="M4 5h9M8.5 3v2m3 0c-1 4.5-4 7.5-7.5 9m3-5c1.2 2.4 3 4.2 5 5" /><path d="m13 21 4-9 4 9m-6.8-2.5h5.6" /></Icon>
);
export const IconSparkle = (p: P) => (
  <Icon {...p}><path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18l-1.8-5.4-5.7-1.8L10.2 9 12 3.5Z" /></Icon>
);
export const IconHeart = (p: P) => (
  <Icon {...p}><path d="M12 20s-7.5-4.4-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.6-7.5 10-7.5 10Z" /></Icon>
);
