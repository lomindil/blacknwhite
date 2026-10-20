'use client';

import type { ImportJobInfo } from '@bnw/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FormError } from '@/components/actions';
import { PageHeader } from '@/components/ui';
import { call, errorMessage } from '@/lib/client-api';
import { formatDate } from '@/lib/format';

export default function ImportPage() {
  const [jobs, setJobs] = useState<ImportJobInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => call<ImportJobInfo[]>('/v1/me/import').then(setJobs).catch(() => undefined);
  useEffect(() => {
    load();
  }, []);
  // Poll while a job is running.
  useEffect(() => {
    if (!jobs.some((j) => j.status === 'queued' || j.status === 'processing')) return;
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [jobs]);

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Library" title="Bring your shelves">
        Import years of shelves and ratings from Goodreads or StoryGraph in about 30 seconds.
      </PageHeader>
      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <div className="card text-sm">
          <div className="h3 mb-2">From Goodreads</div>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>Open <span className="text-ink">My Books → Import and export</span> on Goodreads.</li>
            <li>Click <span className="text-ink">Export Library</span> and download the CSV.</li>
            <li>Upload it here.</li>
          </ol>
        </div>
        <div className="card text-sm">
          <div className="h3 mb-2">From StoryGraph</div>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>Go to <span className="text-ink">Manage Account → Export StoryGraph Library</span>.</li>
            <li>Download the CSV when it's ready.</li>
            <li>Upload it here.</li>
          </ol>
        </div>
      </div>
      <form
        className="card flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          if (!(form.get('file') as File)?.size) return setError('Choose a CSV file first');
          setBusy(true);
          setError(null);
          try {
            await call('/v1/me/import', { form });
            (e.target as HTMLFormElement).reset();
            await load();
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input type="file" name="file" accept=".csv,text/csv" className="flex-1 text-sm" aria-label="CSV export file" />
        <button className="btn" disabled={busy}>{busy ? 'Uploading…' : 'Import'}</button>
      </form>
      <FormError error={error} />

      {jobs.length > 0 && (
        <div className="mt-10">
          <h2 className="h2 mb-4">Your imports</h2>
          <div className="space-y-4">
            {jobs.map((j) => (
              <div key={j.id} className="card">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-medium capitalize">{j.source} · {formatDate(j.createdAt)}</div>
                  <span className="chip">{j.status}</span>
                </div>
                {(j.status === 'processing' || j.status === 'queued') && (
                  <div className="mt-3 h-1 bg-soft">
                    <div className="h-1 bg-ink transition-all" style={{ width: `${j.total ? ((j.matched + j.created) / j.total) * 100 : 5}%` }} />
                  </div>
                )}
                {j.status === 'done' && (
                  <p className="mt-2 text-sm text-muted">
                    {j.total} rows · {j.matched} matched our catalog · {j.created} new books added.{' '}
                    <Link href="/me/books" className="link">See your shelves</Link>
                  </p>
                )}
                {j.error && <p className="mt-2 text-sm text-danger">{j.error}</p>}
                {j.unmatched.length > 0 && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer">{j.unmatched.length} rows to fix by hand</summary>
                    <ul className="mt-2 space-y-1 text-muted">
                      {j.unmatched.map((u) => (
                        <li key={u.row}>
                          Row {u.row}: <span className="text-ink">{u.title}</span> — {u.reason}{' '}
                          {u.title !== '(no title)' && <Link className="link" href={`/books?q=${encodeURIComponent(u.title)}`}>search</Link>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
