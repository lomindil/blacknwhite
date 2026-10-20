import { BRAND } from '@/lib/brand';

/**
 * Placeholder mark: an open book with two differently-shaded pages (two readers, one book)
 * and a small clay dot for the conversation. Revisit once the name is final.
 */
export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#3D5A4C" />
      <path d="M7 10.6c3-1.1 6-.8 8.6 1.1v11.4c-2.6-1.8-5.6-2.1-8.6-1.1z" fill="#FAF8F3" />
      <path d="M25 10.6c-3-1.1-6-.8-8.6 1.1v11.4c2.6-1.8 5.6-2.1 8.6-1.1z" fill="#C4D6C8" />
      <circle cx="24.5" cy="7.5" r="2.6" fill="#E3B39E" />
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="group inline-flex items-center gap-2.5">
      <LogoMark size={size} className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="font-serif text-xl font-medium tracking-tight">{BRAND.name}</span>
    </span>
  );
}
