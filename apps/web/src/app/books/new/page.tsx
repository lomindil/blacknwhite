'use client';

import { LANGUAGES } from '@bnw/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/actions';
import { PageHeader } from '@/components/ui';
import { ApiError, call, errorMessage } from '@/lib/client-api';

export default function NewBookPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Catalog" title="Add a missing book">
        Can't find it? Add it here. New books are reviewed before they appear for everyone — you can start tracking it right away.
      </PageHeader>
      <form
        className="grid gap-5 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const s = (k: string) => (f.get(k) as string)?.trim() || undefined;
          const n = (k: string) => (s(k) ? Number(s(k)) : undefined);
          setBusy(true);
          setError(null);
          try {
            const book = await call<{ id: string }>('/v1/books', {
              body: {
                title: s('title'),
                subtitle: s('subtitle'),
                authors: (s('authors') ?? '').split(',').map((a) => a.trim()).filter(Boolean),
                authorsNative: (s('authorsNative') ?? '').split(',').map((a) => a.trim()).filter(Boolean),
                language: s('language') ?? 'en',
                description: s('description'),
                isbn13: s('isbn13')?.replace(/-/g, ''),
                isbn10: s('isbn10')?.replace(/-/g, ''),
                publishedYear: n('year'),
                pageCount: n('pages'),
                chapterCount: n('chapters'),
                publisher: s('publisher'),
              },
            });
            router.push(`/books/${book.id}`);
          } catch (err) {
            if (err instanceof ApiError && err.code === 'CONFLICT' && err.details?.bookId) {
              router.push(`/books/${err.details.bookId}`);
              return;
            }
            setError(errorMessage(err));
            setBusy(false);
          }
        }}
      >
        <div className="sm:col-span-2"><label className="label" htmlFor="title">Title *</label><input id="title" name="title" className="input" required /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="subtitle">Subtitle</label><input id="subtitle" name="subtitle" className="input" /></div>
        <div><label className="label" htmlFor="authors">Author(s) * — comma separated</label><input id="authors" name="authors" className="input" required /></div>
        <div><label className="label" htmlFor="authorsNative">Author names in native script</label><input id="authorsNative" name="authorsNative" className="input" placeholder="e.g. मुंशी प्रेमचंद" /></div>
        <div>
          <label className="label" htmlFor="language">Language</label>
          <select id="language" name="language" className="input" defaultValue="en">
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>
        <div><label className="label" htmlFor="publisher">Publisher</label><input id="publisher" name="publisher" className="input" /></div>
        <div><label className="label" htmlFor="isbn13">ISBN-13</label><input id="isbn13" name="isbn13" className="input" inputMode="numeric" /></div>
        <div><label className="label" htmlFor="isbn10">ISBN-10</label><input id="isbn10" name="isbn10" className="input" /></div>
        <div><label className="label" htmlFor="year">Year published</label><input id="year" name="year" type="number" className="input" /></div>
        <div><label className="label" htmlFor="pages">Pages</label><input id="pages" name="pages" type="number" className="input" /></div>
        <div><label className="label" htmlFor="chapters">Chapters</label><input id="chapters" name="chapters" type="number" className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" rows={4} className="input" /></div>
        <div className="sm:col-span-2">
          <FormError error={error} />
          <button className="btn mt-2 px-8" disabled={busy}>Add book</button>
        </div>
      </form>
    </div>
  );
}
