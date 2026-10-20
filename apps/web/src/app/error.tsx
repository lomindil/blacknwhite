'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="h2">Something went wrong</h1>
      <p className="mt-2 text-muted">Please try again. If it keeps happening, the API may be down.</p>
      <button type="button" onClick={reset} className="btn mt-8">Try again</button>
    </div>
  );
}
