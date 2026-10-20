import type { BlogSummary, Page } from '@bnw/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogCard } from '@/components/blog';
import { IconPlus } from '@/components/icons';
import { Empty } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { api, getMe } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Essays, reading lists and club stories from readers across India.',
};

type SP = { sort?: string; tag?: string; cursor?: string };

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', pending: 'In review', published: 'Published', removed: 'Removed' };

export default async function BlogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sort = sp.sort === 'top' ? 'top' : 'latest';
  const params = new URLSearchParams({ sort, limit: '13' });
  if (sp.tag) params.set('tag', sp.tag);
  if (sp.cursor) params.set('cursor', sp.cursor);
  const [me, page, tags] = await Promise.all([
    getMe(),
    api<Page<BlogSummary>>(`/v1/blog?${params}`),
    api<{ tag: string; count: number }[]>('/v1/blog-tags').catch(() => []),
  ]);
  const mine = me ? await api<BlogSummary[]>('/v1/me/blog').catch(() => []) : [];
  const [featured, ...rest] = sp.cursor ? [null, ...page.items] : page.items;
  const link = (o: Partial<SP>) => {
    const q = new URLSearchParams({ ...(sort === 'top' ? { sort } : {}), ...(sp.tag ? { tag: sp.tag } : {}), ...o } as Record<string, string>);
    for (const [k, v] of [...q.entries()]) if (!v) q.delete(k);
    return `/blog${q.toString() ? `?${q}` : ''}`;
  };

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-fade-up">
          <div className="eyebrow mb-2">Community blog</div>
          <h1 className="h1">Stories from readers</h1>
          <p className="mt-2 max-w-2xl text-muted">Essays, reading lists, club diaries and book recommendations — written by readers across India. The posts readers love most rise to the top.</p>
        </div>
        <Link href={me ? '/blog/new' : '/login?next=/blog/new'} className="btn shrink-0"><IconPlus size={16} /> Write a post</Link>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        {(['latest', 'top'] as const).map((s) => (
          <Link key={s} href={link({ sort: s === 'top' ? 'top' : '', cursor: '' })} className={sort === s ? 'btn btn-sm' : 'btn-ghost btn-sm'}>
            {s === 'latest' ? 'Latest' : 'Most loved'}
          </Link>
        ))}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {sp.tag && <Link href={link({ tag: '', cursor: '' })} className="chip border-sage-300 bg-sage-50 text-sage-700">#{sp.tag} ×</Link>}
        {tags.filter((t) => t.tag !== sp.tag).slice(0, 10).map((t) => (
          <Link key={t.tag} href={link({ tag: t.tag, cursor: '' })} className="chip transition hover:border-sage-300 hover:text-sage-700">#{t.tag}</Link>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          {page.items.length === 0 ? (
            <Empty title={sp.tag ? `No posts tagged #${sp.tag} yet` : 'No posts yet'}>Be the first to write one — a book you loved, a reading list, or a story from your club.</Empty>
          ) : (
            <>
              {featured && <div className="mb-6"><BlogCard post={featured} featured /></div>}
              <div className="grid gap-6 sm:grid-cols-2">
                {rest.map((p) => p && <BlogCard key={p.id} post={p} />)}
              </div>
              {page.nextCursor && (
                <div className="mt-8 text-center">
                  <Link href={link({ cursor: page.nextCursor })} className="btn-ghost">Older posts</Link>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="space-y-6">
          <div className="card bg-sage-50/60">
            <h2 className="font-serif text-lg font-medium">Write for the community</h2>
            <p className="mt-1 text-sm text-muted">Anyone can write. Share a review, a reading list, or how your club runs. Add photos too.</p>
            <Link href={me ? '/blog/new' : '/login?next=/blog/new'} className="btn btn-sm mt-4">Start writing</Link>
          </div>
          {mine.length > 0 && (
            <div className="card p-0">
              <h2 className="border-b border-line/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your posts</h2>
              <ul className="divide-y divide-line/70">
                {mine.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <Link href={p.status === 'published' ? `/blog/${p.slug}` : `/blog/${p.slug}/edit`} className="block px-5 py-3 transition hover:bg-soft">
                      <div className="truncate text-sm font-medium">{p.title}</div>
                      <div className="mt-0.5 flex gap-2 text-xs text-muted">
                        <span className={p.status === 'published' ? 'text-sage-700' : p.status === 'pending' ? 'text-ochre-700' : ''}>{STATUS_LABEL[p.status]}</span>
                        <span>· {formatDate(p.updatedAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
