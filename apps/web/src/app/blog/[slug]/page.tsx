import type { BlogDetail, BlogSummary, Page } from '@bnw/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ReportButton } from '@/components/actions';
import { BlogCard, BlogMeta } from '@/components/blog';
import { BlogMarkdown } from '@/components/blog-markdown';
import { api, apiOrNotFound, getMe } from '@/lib/server-api';
import { ArticleActions } from './article-actions';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await api<BlogDetail>(`/v1/blog/${slug}`).catch(() => null);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: 'article', images: post.cover ? [post.cover.url] : undefined },
    robots: post.status === 'published' ? undefined : { index: false },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const me = await getMe();
  const post = await apiOrNotFound<BlogDetail>(`/v1/blog/${slug}`);
  const more = await api<Page<BlogSummary>>('/v1/blog?sort=top&limit=4').then((p) => p.items.filter((x) => x.id !== post.id).slice(0, 3)).catch(() => []);

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/blog" className="text-sm text-muted transition hover:text-ink">← All posts</Link>
      {post.status !== 'published' && (
        <div className={`mt-4 rounded-2xl border p-4 text-sm ${post.status === 'pending' ? 'border-ochre-200 bg-ochre-50 text-ochre-800' : 'border-line bg-soft text-muted'}`}>
          {post.status === 'pending'
            ? 'This post is waiting for a quick review before it goes live — posts from new accounts are checked first. Only you can see it.'
            : post.status === 'draft'
              ? 'This is a draft. Only you can see it.'
              : 'This post was removed by the moderation team.'}
        </div>
      )}
      <header className="mt-6 animate-fade-up">
        {post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="rounded-full bg-sage-50 px-2.5 py-0.5 text-xs font-medium text-sage-700 hover:bg-sage-100">#{t}</Link>
            ))}
          </div>
        )}
        <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">{post.title}</h1>
        {post.excerpt && <p className="mt-4 text-xl leading-relaxed text-muted">{post.excerpt}</p>}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
          <Link href={`/readers/${post.author.id}`} className="hover:opacity-80"><BlogMeta post={post} /></Link>
          <ArticleActions post={post} signedIn={Boolean(me)} />
        </div>
      </header>
      {post.cover && (
        <div className="mt-8 overflow-hidden rounded-3xl shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover.url} alt="" className="w-full object-cover" width={post.cover.width} height={post.cover.height} />
        </div>
      )}
      <div className="mt-10">
        <BlogMarkdown text={post.body} />
      </div>
      <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <ArticleActions post={post} signedIn={Boolean(me)} />
        {me && !post.mine && <ReportButton targetType="blog" targetId={post.id} label="Report this post" />}
      </footer>
      {more.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 font-serif text-2xl font-medium">More from the community</h2>
          <div className="grid gap-5 sm:grid-cols-3">{more.map((p) => <BlogCard key={p.id} post={p} />)}</div>
        </section>
      )}
    </article>
  );
}
