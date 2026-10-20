import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="font-serif text-6xl">404</div>
      <h1 className="h2 mt-4">This page isn't on our shelves</h1>
      <p className="mt-2 text-muted">It may have been moved, made private, or never existed.</p>
      <Link href="/" className="btn mt-8">Go home</Link>
    </div>
  );
}
