import Link from 'next/link';
import { RedMascot } from '@/components/mascot';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <RedMascot size={150} className="mx-auto" />
      <div className="mt-4 font-serif text-5xl text-russet-600">404</div>
      <h1 className="h2 mt-3">Red looked everywhere — this page isn&apos;t on our shelves</h1>
      <p className="mt-2 text-muted">It may have been moved, made private, or never existed.</p>
      <Link href="/" className="btn mt-8">Go home</Link>
    </div>
  );
}
