'use client';

import type { BlogDetail } from '@bnw/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconHeartFill, IconLink } from '@/components/icons';
import { call } from '@/lib/client-api';

/** Like, share and (for the author) edit/delete. */
export function ArticleActions({ post, signedIn }: { post: BlogDetail; signedIn: boolean }) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.likedByMe);
  const [count, setCount] = useState(post.likeCount);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {post.status === 'published' && (
        <button
          type="button"
          aria-pressed={liked}
          onClick={async () => {
            if (!signedIn) return router.push(`/login?next=/blog/${post.slug}`);
            setLiked(!liked);
            setCount((c) => c + (liked ? -1 : 1));
            try {
              const r = await call<{ liked: boolean; likeCount: number }>(`/v1/blog/${post.id}/like`, { method: 'POST' });
              setLiked(r.liked);
              setCount(r.likeCount);
            } catch {
              setLiked(liked);
              setCount(post.likeCount);
            }
          }}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition ${
            liked ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-line bg-surface text-muted hover:border-rose-200 hover:text-rose-600'
          }`}
        >
          <IconHeartFill size={16} filled={liked} /> {count > 0 ? count : 'Like'}
        </button>
      )}
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="btn-ghost btn-sm h-9"
      >
        <IconLink size={15} /> {copied ? 'Link copied' : 'Copy link'}
      </button>
      {post.mine && (
        <>
          <Link href={`/blog/${post.slug}/edit`} className="btn-ghost btn-sm h-9">Edit</Link>
          <button
            type="button"
            className="btn-ghost btn-sm btn-danger h-9"
            onClick={async () => {
              if (!confirm('Delete this post for good?')) return;
              await call(`/v1/blog/${post.id}`, { method: 'DELETE' });
              router.push('/blog');
              router.refresh();
            }}
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
}
