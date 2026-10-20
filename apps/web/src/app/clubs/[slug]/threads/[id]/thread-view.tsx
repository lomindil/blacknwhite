'use client';

import type { Page, PostItem, ThreadDetail } from '@bnw/shared';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { FormError, ReportButton } from '@/components/actions';
import { Markdown } from '@/components/markdown';
import { Avatar } from '@/components/ui';
import { IconLock } from '@/components/icons';
import { call, errorMessage } from '@/lib/client-api';
import { timeAgo } from '@/lib/format';
import { getSocket, useRoom } from '@/lib/socket';

export function ThreadView({ thread, initial, meId, canModerate }: { thread: ThreadDetail; initial: Page<PostItem>; meId: string; canModerate: boolean }) {
  const [posts, setPosts] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // New posts arrive as ids; we refetch over REST so per-post spoiler gates apply.
  const reload = useCallback(async () => {
    const page = await call<Page<PostItem>>(`/v1/threads/${thread.id}/posts?limit=100`);
    setPosts(page.items);
    setCursor(page.nextCursor);
  }, [thread.id]);

  useRoom(`thread:${thread.id}`, {
    'post:new': reload,
    'post:updated': reload,
    typing: (d: { userId: string }) => {
      if (d.userId === meId) return;
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3000);
    },
  });

  return (
    <div className="mt-6">
      <ol className="card divide-y divide-line/70 p-0">
        {posts.map((p) => (
          <li key={p.id} className="px-5 py-5 sm:px-6">
            <Post post={p} meId={meId} canModerate={canModerate} onChange={reload} />
          </li>
        ))}
      </ol>
      {cursor && (
        <button
          type="button"
          className="btn-ghost mt-4 w-full"
          onClick={async () => {
            const page = await call<Page<PostItem>>(`/v1/threads/${thread.id}/posts?limit=100&cursor=${cursor}`);
            setPosts((ps) => [...ps, ...page.items]);
            setCursor(page.nextCursor);
          }}
        >
          Load more
        </button>
      )}
      <div className="h-6 pt-2 text-xs text-muted">{typing && 'Someone is typing…'}</div>
      <ReplyForm thread={thread} onPosted={reload} />
    </div>
  );
}

function Post({ post, meId, canModerate, onChange }: { post: PostItem; meId: string; canModerate: boolean; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState('body' in post ? post.body : '');

  if (post.locked) {
    return <div className="flex items-center gap-2 rounded-xl border border-dashed border-plum-200 bg-plum-50/50 px-3 py-2 text-sm text-plum-700"><IconLock size={15} /> A reply about chapter {post.chapterRef} — finish that chapter to read it.</div>;
  }
  if (post.hidden) {
    return <div className="text-sm text-muted">{post.reason === 'deleted' ? 'This post was removed.' : "Hidden — you've blocked this reader."}</div>;
  }
  return (
    <article>
      <div className="mb-2 flex items-center gap-3">
        <Link href={`/readers/${post.author.id}`} className="flex items-center gap-2 hover:underline">
          <Avatar user={post.author} size={28} />
          <span className="text-sm font-medium">{post.author.displayName}</span>
        </Link>
        <span className="text-xs text-muted">
          {timeAgo(post.createdAt)}
          {post.editedAt && ' · edited'}
          {post.chapterRef && ` · about chapter ${post.chapterRef}`}
        </span>
      </div>
      {editing ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await call(`/v1/posts/${post.id}`, { method: 'PATCH', body: { body } });
            setEditing(false);
            onChange();
          }}
        >
          <textarea className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <button className="btn btn-sm">Save</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <Markdown text={post.body} />
      )}
      <div className="mt-2 flex flex-wrap items-start gap-4 text-xs text-muted">
        {post.mine && !editing && <button type="button" className="hover:text-ink hover:underline" onClick={() => setEditing(true)}>Edit</button>}
        {(post.mine || canModerate) && (
          <button
            type="button"
            className="hover:text-ink hover:underline"
            onClick={async () => {
              if (!confirm('Delete this post?')) return;
              await call(`/v1/posts/${post.id}`, { method: 'DELETE' });
              onChange();
            }}
          >
            Delete
          </button>
        )}
        {post.author.id !== meId && <ReportButton targetType="post" targetId={post.id} />}
      </div>
    </article>
  );
}

function ReplyForm({ thread, onPosted }: { thread: ThreadDetail; onPosted: () => void }) {
  const [body, setBody] = useState('');
  const [ref, setRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastTyping = useRef(0);

  return (
    <form
      className="card mt-2 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await call(`/v1/threads/${thread.id}/posts`, { body: { body, chapterRef: ref ? Number(ref) : null } });
          setBody('');
          setRef('');
          onPosted();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="label" htmlFor="reply">Reply</label>
      <textarea
        id="reply"
        rows={4}
        className="input"
        value={body}
        required
        onChange={(e) => {
          setBody(e.target.value);
          if (Date.now() - lastTyping.current > 2000) {
            lastTyping.current = Date.now();
            getSocket().emit('typing', { room: `thread:${thread.id}` });
          }
        }}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        {thread.book ? (
          <div className="text-xs text-muted">
            <label htmlFor="ref" className="mr-2">Mentions a later chapter?</label>
            <input id="ref" type="number" min={thread.chapterGate + 1} className="input inline-block w-24 py-1" placeholder="Chapter" value={ref} onChange={(e) => setRef(e.target.value)} />
            <span className="ml-2">Hides your reply from readers who haven't got there.</span>
          </div>
        ) : <span />}
        <button className="btn" disabled={busy}>Post reply</button>
      </div>
      <p className="text-xs text-muted">Markdown works. Hide a sentence with ||double bars||.</p>
      <FormError error={error} />
    </form>
  );
}
