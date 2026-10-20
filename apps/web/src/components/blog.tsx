import type { BlogSummary } from '@bnw/shared';
import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { Avatar, hash } from './ui';

const COVER_TONES = ['from-sage-100 to-sage-50', 'from-clay-100 to-clay-50', 'from-sky-100 to-sky-50', 'from-ochre-100 to-ochre-50', 'from-plum-100 to-plum-50', 'from-rose-100 to-rose-50'];

function Cover({ post, className }: { post: BlogSummary; className: string }) {
  if (post.cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={post.cover.url} alt="" className={`${className} object-cover transition duration-700 group-hover:scale-[1.03]`} loading="lazy" />;
  }
  return (
    <div className={`${className} relative flex items-end bg-gradient-to-br p-5 ${COVER_TONES[hash(post.title) % COVER_TONES.length]}`}>
      <div className="dots absolute inset-0 opacity-70" aria-hidden />
      <span className="relative font-serif text-2xl leading-tight text-ink/70">{post.title}</span>
    </div>
  );
}

export function BlogMeta({ post }: { post: BlogSummary }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-muted">
      <Avatar user={post.author} size={26} />
      <span className="font-medium text-ink">{post.author.displayName}</span>
      <span>·</span>
      <span>{post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.updatedAt)}</span>
      <span>·</span>
      <span>{post.readMinutes} min read</span>
    </div>
  );
}

export function BlogCard({ post, featured = false }: { post: BlogSummary; featured?: boolean }) {
  return (
    <Link href={`/blog/${post.slug}`} className={`card card-hover group flex overflow-hidden p-0 ${featured ? 'flex-col md:grid md:grid-cols-[1.2fr_1fr]' : 'flex-col'}`}>
      <div className="overflow-hidden">
        <Cover post={post} className={`w-full ${featured ? 'aspect-[16/10] md:h-full md:aspect-auto' : 'aspect-[16/10]'}`} />
      </div>
      <div className={`flex flex-1 flex-col ${featured ? 'p-6 sm:p-8' : 'p-5'}`}>
        {post.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-sage-50 px-2 py-0.5 text-[11px] font-medium text-sage-700">#{t}</span>
            ))}
          </div>
        )}
        <h3 className={`font-serif font-medium leading-snug group-hover:underline ${featured ? 'text-3xl' : 'text-xl'}`}>{post.title}</h3>
        <p className={`mt-2 text-muted ${featured ? 'line-clamp-4 text-lg' : 'line-clamp-3 text-sm'}`}>{post.excerpt}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <BlogMeta post={post} />
          {post.likeCount > 0 && <span className="shrink-0 text-sm text-rose-600">♥ {post.likeCount}</span>}
        </div>
      </div>
    </Link>
  );
}
