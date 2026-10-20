import type { BookSummary, ReportItem, UserSummary } from '@bnw/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionButton } from '@/components/actions';
import { Empty, PageHeader, Section } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { api, requireMe } from '@/lib/server-api';

export const metadata = { title: 'Moderation', robots: { index: false } };

type PendingBook = BookSummary & { description: string | null; isbns: string[]; addedBy: UserSummary | null; createdAt: string };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const me = await requireMe('/admin');
  if (!me.isAdmin) notFound();
  const { status = 'open' } = await searchParams;
  const [reports, books] = await Promise.all([api<ReportItem[]>(`/v1/admin/reports?status=${status}`), api<PendingBook[]>('/v1/admin/books/pending')]);

  return (
    <div>
      <PageHeader eyebrow="Trust and safety" title="Moderation">
        Reports and new books waiting for review. IT Rules require acting on reported content within the required timelines.
      </PageHeader>
      <Section
        title={`Reports (${reports.length})`}
        action={
          <div className="flex gap-3 text-sm">
            {['open', 'actioned', 'dismissed'].map((s) => (
              <Link key={s} href={`/admin?status=${s}`} className={s === status ? 'underline' : 'text-muted hover:text-ink'}>{s}</Link>
            ))}
          </div>
        }
      >
        {reports.length ? (
          <ul className="space-y-4">
            {reports.map((r) => (
              <li key={r.id} className="card">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="chip mr-2">{r.targetType.replace('_', ' ')}</span>
                    <span className="font-medium capitalize">{r.reason}</span>
                  </div>
                  <span className="text-xs text-muted">reported by {r.reporter.displayName} · {timeAgo(r.createdAt)}</span>
                </div>
                {r.details && <p className="mt-2 text-sm">“{r.details}”</p>}
                {r.context.excerpt && <pre className="mt-3 whitespace-pre-wrap border-l-2 border-line bg-soft p-3 font-sans text-sm">{r.context.excerpt}</pre>}
                <div className="mt-2 text-xs text-muted">
                  {r.context.author && <>Author: <Link className="link" href={`/readers/${r.context.author.id}`}>{r.context.author.displayName}</Link> · </>}
                  {r.context.url && <Link className="link" href={r.context.url}>Open in context</Link>}
                </div>
                {r.status === 'open' && (
                  <div className="mt-4 flex gap-2">
                    <ActionButton path={`/v1/admin/reports/${r.id}/resolve`} body={{ action: 'remove_content' }} className="btn btn-sm" confirm="Remove this content?">
                      Remove content
                    </ActionButton>
                    <ActionButton path={`/v1/admin/reports/${r.id}/resolve`} body={{ action: 'dismiss' }} className="btn-ghost btn-sm">Dismiss</ActionButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Nothing to review" />
        )}
      </Section>
      <Section title={`Books awaiting review (${books.length})`}>
        {books.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {books.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/books/${b.id}`} className="font-serif hover:underline">{b.title}</Link>
                  <div className="text-xs text-muted">
                    {b.authors.join(', ')} · {b.language}
                    {b.isbns.length > 0 && ` · ISBN ${b.isbns.join(', ')}`}
                    {b.addedBy && ` · added by ${b.addedBy.displayName}`} · {timeAgo(b.createdAt)}
                  </div>
                </div>
                <ActionButton path={`/v1/admin/books/${b.id}/review`} body={{ decision: 'approve' }} className="btn btn-sm">Approve</ActionButton>
                <ActionButton path={`/v1/admin/books/${b.id}/review`} body={{ decision: 'reject' }} className="btn-ghost btn-sm">Reject</ActionButton>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No books waiting" />
        )}
      </Section>
    </div>
  );
}
