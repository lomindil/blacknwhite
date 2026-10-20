import type { BlogSummary } from '@bnw/shared';
import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/server-api';
import { SimpleAction } from '../shell';

export const metadata = { title: 'Blog review' };

export default async function OpsBlog() {
  const pending = await api<BlogSummary[]>('/ops/blog/pending');
  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl font-medium">Blog review</h1>
      <p className="mb-6 text-sm text-muted">Posts from accounts younger than 7 days wait here before going live. Approving notifies the author.</p>
      {pending.length ? (
        <ul className="space-y-4">
          {pending.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-start gap-5">
              {p.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover.url} alt="" className="h-24 w-36 rounded-xl object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-serif text-xl">{p.title}</div>
                <div className="mt-1 text-xs text-muted">by {p.author.displayName} · {formatDate(p.updatedAt)} · {p.readMinutes} min read {p.tags.length > 0 && `· ${p.tags.map((t) => `#${t}`).join(' ')}`}</div>
                <p className="mt-2 line-clamp-3 text-sm text-ink/80">{p.excerpt}</p>
                <Link href={`/blog/${p.slug}`} target="_blank" className="link mt-2 inline-block text-sm">Read the full post ↗</Link>
              </div>
              <div className="flex gap-2">
                <SimpleAction label="Approve" path={`/blog/${p.id}/review`} body={{ decision: 'approve' }} />
                <SimpleAction label="Remove" path={`/blog/${p.id}/review`} body={{ decision: 'remove' }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card py-12 text-center text-muted">Nothing waiting for review.</div>
      )}
    </div>
  );
}
