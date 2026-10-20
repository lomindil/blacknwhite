'use client';

import type { BoardEntry, MediaInfo, Me, Page } from '@bnw/shared';
import { MAX_POST_PHOTOS } from '@bnw/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FormError, ReportButton } from '@/components/actions';
import { IconChat, IconChevron } from '@/components/icons';
import { ReactionBar } from '@/components/reactions';
import { Markdown } from '@/components/markdown';
import { Avatar, Empty } from '@/components/ui';
import { call, errorMessage } from '@/lib/client-api';
import { timeAgo } from '@/lib/format';

// ---------- Composer ----------

type Pending = { localId: string; preview: string; media?: MediaInfo; error?: string };

function PhotoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m4 17 4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 17m-1.5-1.5 1.9-1.9a1.5 1.5 0 0 1 2.1 0L21 17" />
    </svg>
  );
}

export function BoardComposer({ clubId, me }: { clubId: string; me: Me }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploading = photos.some((p) => !p.media && !p.error);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_POST_PHOTOS - photos.length;
    const chosen = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room);
    if (files.length > room) setError(`You can add up to ${MAX_POST_PHOTOS} photos.`);
    for (const file of chosen) {
      const localId = Math.random().toString(36).slice(2);
      const pending: Pending = { localId, preview: URL.createObjectURL(file) };
      setPhotos((ps) => [...ps, pending]);
      const form = new FormData();
      form.append('file', file);
      call<MediaInfo>('/v1/media', { form })
        .then((media) => setPhotos((ps) => ps.map((p) => (p.localId === localId ? { ...p, media } : p))))
        .catch((e) => setPhotos((ps) => ps.map((p) => (p.localId === localId ? { ...p, error: errorMessage(e) } : p))));
    }
  };

  const reset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setTitle('');
    setBody('');
    setPhotos([]);
    setError(null);
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="card mb-6 flex items-center gap-3">
        <Avatar user={me} size={40} />
        <button type="button" onClick={() => setOpen(true)} className="input flex-1 cursor-text bg-paper text-left text-muted hover:border-sage-300">
          Share something with the club…
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => fileInput.current?.click(), 50);
          }}
          className="btn-ghost h-11 w-11 shrink-0 p-0"
          aria-label="Post with photos"
        >
          <PhotoIcon />
        </button>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>
    );
  }

  return (
    <form
      className="card mb-6 animate-pop-in"
      onSubmit={async (e) => {
        e.preventDefault();
        if (uploading) return;
        setBusy(true);
        setError(null);
        try {
          await call(`/v1/clubs/${clubId}/board`, {
            body: { title, body, mediaIds: photos.filter((p) => p.media).map((p) => p.media!.id) },
          });
          reset();
          router.refresh();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="mb-4 flex items-center gap-3">
        <Avatar user={me} size={40} />
        <div>
          <div className="font-medium">{me.displayName}</div>
          <div className="text-xs text-muted">Posting to the club board</div>
        </div>
      </div>
      <input
        className="w-full border-0 bg-transparent font-serif text-2xl font-medium outline-none placeholder:text-muted/60"
        placeholder="Title"
        aria-label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={150}
        required
        minLength={3}
        autoFocus
      />
      <textarea
        className="mt-2 w-full resize-y border-0 bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted/70"
        rows={4}
        placeholder="Write your post… (Markdown works)"
        aria-label="Message"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={5000}
      />

      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-4 gap-2">
          {photos.map((p) => (
            <li key={p.localId} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.media?.url ?? p.preview} alt="" className={`h-full w-full object-cover transition ${p.media ? '' : 'opacity-60'}`} />
              {!p.media && !p.error && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" aria-label="Uploading" />
                </span>
              )}
              {p.error && <span className="absolute inset-x-0 bottom-0 bg-danger/90 px-1.5 py-1 text-[10px] leading-tight text-white">{p.error}</span>}
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(p.preview);
                  setPhotos((ps) => ps.filter((x) => x.localId !== p.localId));
                }}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white opacity-90 transition hover:bg-ink"
                aria-label="Remove photo"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={photos.length >= MAX_POST_PHOTOS}
            className="btn-ghost btn-sm"
          >
            <PhotoIcon size={16} /> {photos.length ? `Photos ${photos.length}/${MAX_POST_PHOTOS}` : 'Add photos'}
          </button>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <span className="hidden text-xs text-muted sm:inline">Location data is removed from photos.</span>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={reset}>Cancel</button>
          <button className="btn btn-sm" disabled={busy || uploading || title.trim().length < 3}>
            {uploading ? 'Uploading…' : 'Post'}
          </button>
        </div>
      </div>
      <FormError error={error} />
    </form>
  );
}

// ---------- Feed ----------

export function BoardFeed({ clubId, slug, initial, canModerate }: { clubId: string; slug: string; initial: Page<BoardEntry>; canModerate: boolean }) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  useEffect(() => {
    setItems(initial.items);
    setCursor(initial.nextCursor);
  }, [initial]);

  if (!items.length) {
    return <Empty title="The board is quiet">Be the first to post — say hello, share a photo from the last meetup, or recommend a book.</Empty>;
  }
  return (
    <div className="space-y-5">
      {items.map((p) => (
        <FeedCard key={p.id} post={p} slug={slug} canModerate={canModerate} />
      ))}
      {cursor && (
        <button
          type="button"
          className="btn-ghost w-full"
          onClick={async () => {
            const page = await call<Page<BoardEntry>>(`/v1/clubs/${clubId}/board?limit=30&cursor=${cursor}`);
            setItems((xs) => [...xs, ...page.items]);
            setCursor(page.nextCursor);
          }}
        >
          Older posts
        </button>
      )}
    </div>
  );
}

// ---------- Photos ----------

function Gallery({ images, onOpen }: { images: MediaInfo[]; onOpen: (i: number) => void }) {
  if (!images.length) return null;
  const n = images.length;
  const layout = n === 1 ? 'grid-cols-1' : n === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2';
  return (
    <div className={`mt-4 grid gap-1.5 overflow-hidden rounded-2xl ${layout} ${n > 1 ? 'h-[22rem]' : ''}`}>
      {images.map((img, i) => (
        <button
          key={img.id}
          type="button"
          onClick={() => onOpen(i)}
          className={`group relative overflow-hidden bg-soft ${n === 3 && i === 0 ? 'row-span-2' : ''}`}
          aria-label={`Open photo ${i + 1} of ${n}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt=""
            loading="lazy"
            width={img.width}
            height={img.height}
            className={`w-full object-cover transition duration-500 group-hover:scale-[1.03] ${n === 1 ? 'max-h-[30rem]' : 'h-full'}`}
          />
        </button>
      ))}
    </div>
  );
}

function Lightbox({ images, index, onClose }: { images: MediaInfo[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % images.length);
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [images.length, onClose]);

  // Portal to <body>: an animated ancestor's transform would otherwise trap position:fixed.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[i].url} alt="" className="max-h-[88vh] max-w-full animate-pop-in rounded-xl object-contain shadow-lift" onClick={(e) => e.stopPropagation()} />
      <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      {images.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); setI((x) => (x - 1 + images.length) % images.length); }} className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous photo">
            <IconChevron dir="left" size={22} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setI((x) => (x + 1) % images.length); }} className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next photo">
            <IconChevron size={22} />
          </button>
          <span className="absolute bottom-5 rounded-full bg-white/10 px-3 py-1 text-xs text-white">{i + 1} / {images.length}</span>
        </>
      )}
    </div>,
    document.body,
  );
}

// ---------- Posts and comments ----------

function Hidden({ reason, kind = 'post' }: { reason: BoardEntry['hiddenReason']; kind?: 'post' | 'comment' }) {
  return <p className="text-sm italic text-muted">{reason === 'deleted' ? `This ${kind} was removed.` : "Hidden — you've blocked this reader."}</p>;
}

/** Delete (own or as organizer) and Report, kept small and out of the way. */
function ModActions({ entry, canModerate, afterDelete }: { entry: BoardEntry; canModerate: boolean; afterDelete?: () => void }) {
  const router = useRouter();
  if (entry.hiddenReason) return null;
  return (
    <span className="inline-flex items-center gap-3 text-xs text-muted">
      {(entry.mine || canModerate) && (
        <button
          type="button"
          className="transition hover:text-danger"
          onClick={async () => {
            if (!confirm(entry.parentId ? 'Delete this comment?' : 'Delete this post?')) return;
            await call(`/v1/posts/${entry.id}`, { method: 'DELETE' });
            if (afterDelete) afterDelete();
            else router.refresh();
          }}
        >
          Delete
        </button>
      )}
      {!entry.mine && <ReportButton targetType="post" targetId={entry.id} />}
    </span>
  );
}

function PostHeader({ post, canModerate, afterDelete }: { post: BoardEntry; canModerate: boolean; afterDelete?: () => void }) {
  return (
    <header className="mb-3 flex items-center gap-3">
      <Link href={`/readers/${post.author.id}`}><Avatar user={post.author} size={40} /></Link>
      <div className="min-w-0 flex-1">
        <Link href={`/readers/${post.author.id}`} className="font-medium hover:underline">{post.author.displayName}</Link>
        <div className="text-xs text-muted">{timeAgo(post.createdAt)}{post.editedAt && ' · edited'}</div>
      </div>
      <ModActions entry={post} canModerate={canModerate} afterDelete={afterDelete} />
    </header>
  );
}

function PostContent({ post, onOpenPhoto, clampBody = false }: { post: BoardEntry; onOpenPhoto: (i: number) => void; clampBody?: boolean }) {
  if (post.hiddenReason) return <Hidden reason={post.hiddenReason} />;
  return (
    <>
      {post.title && <h3 className="font-serif text-xl font-medium leading-snug sm:text-2xl">{post.title}</h3>}
      {post.body && (
        <div className={`mt-1.5 text-ink/90 ${clampBody ? 'line-clamp-6' : ''}`}>
          <Markdown text={post.body} />
        </div>
      )}
      <Gallery images={post.images} onOpen={onOpenPhoto} />
    </>
  );
}

/** A post in the feed: comments stay on the post page. */
function FeedCard({ post, slug, canModerate }: { post: BoardEntry; slug: string; canModerate: boolean }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const href = `/clubs/${slug}/board/${post.id}`;
  return (
    <article className="card animate-fade-up p-5 sm:p-6">
      <PostHeader post={post} canModerate={canModerate} />
      <PostContent post={post} onOpenPhoto={setLightbox} clampBody />
      {lightbox !== null && <Lightbox images={post.images} index={lightbox} onClose={() => setLightbox(null)} />}
      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-3">
        {post.hiddenReason ? <span /> : <ReactionBar postId={post.id} initial={post.reactions} />}
        <Link href={post.commentCount ? href : `${href}#comment`} className="group inline-flex items-center gap-2 text-sm text-muted transition hover:text-sage-700">
          <IconChat size={16} />
          {post.commentCount ? (
            <>
              <span>{post.commentCount} comment{post.commentCount > 1 ? 's' : ''}</span>
              <span className="font-medium text-sage-700 group-hover:underline">View all</span>
            </>
          ) : (
            <span className="font-medium group-hover:underline">Comment</span>
          )}
        </Link>
      </footer>
    </article>
  );
}

function CommentBox({ parentId, placeholder, autoFocus, onDone, compact }: { parentId: string; placeholder: string; autoFocus?: boolean; onDone?: () => void; compact?: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        setError(null);
        try {
          await call(`/v1/posts/${parentId}/replies`, { body: { body } });
          setBody('');
          onDone?.();
          router.refresh();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="min-w-0 flex-1">
        <textarea
          className={`input resize-none ${compact ? 'min-h-[2.25rem] py-1.5 text-sm' : 'min-h-[2.75rem]'}`}
          rows={1}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label={placeholder}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
            if (e.key === 'Escape') onDone?.();
          }}
        />
        <FormError error={error} />
      </div>
      <button className={`btn shrink-0 ${compact ? 'btn-sm' : ''}`} disabled={busy || !body.trim()}>
        {compact ? 'Reply' : 'Comment'}
      </button>
    </form>
  );
}

const MAX_INDENT = 4;

function Comment({ c, depth, canModerate }: { c: BoardEntry; depth: number; canModerate: boolean }) {
  const [replying, setReplying] = useState(false);
  return (
    <li className="animate-fade-up">
      <div className="flex gap-2.5">
        <Link href={`/readers/${c.author.id}`} className="shrink-0"><Avatar user={c.author} size={depth ? 28 : 34} /></Link>
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-md bg-soft px-3.5 py-2.5">
            <div className="text-xs">
              <Link href={`/readers/${c.author.id}`} className="font-medium hover:underline">{c.author.displayName}</Link>
              <span className="text-muted"> · {timeAgo(c.createdAt)}</span>
            </div>
            {c.body ? <div className="text-[14px]"><Markdown text={c.body} /></div> : <Hidden reason={c.hiddenReason} kind="comment" />}
          </div>
          {!c.hiddenReason && (
            <div className="mt-1.5 flex flex-wrap items-center gap-3 pl-1">
              <ReactionBar postId={c.id} initial={c.reactions} size="sm" />
              <button type="button" onClick={() => setReplying((x) => !x)} className="text-xs font-medium text-muted transition hover:text-sage-700">
                Reply
              </button>
              <ModActions entry={c} canModerate={canModerate} />
            </div>
          )}
          {replying && (
            <div className="mt-2">
              <CommentBox parentId={c.id} placeholder={`Reply to ${c.author.displayName}…`} autoFocus compact onDone={() => setReplying(false)} />
            </div>
          )}
        </div>
      </div>
      {c.replies.length > 0 && (
        <ul className={`mt-3 space-y-3 ${depth < MAX_INDENT ? 'ml-4 border-l-2 border-line/70 pl-4 sm:ml-5' : ''}`}>
          {c.replies.map((r) => (
            <Comment key={r.id} c={r} depth={depth + 1} canModerate={canModerate} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** The post page: the full post, its reactions, and every comment as a thread. */
export function PostDetail({ post, slug, canModerate }: { post: BoardEntry; slug: string; canModerate: boolean }) {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<number | null>(null);
  return (
    <div className="space-y-5">
      <article className="card p-5 sm:p-7">
        <PostHeader post={post} canModerate={canModerate} afterDelete={() => router.push(`/clubs/${slug}/board`)} />
        <PostContent post={post} onOpenPhoto={setLightbox} />
        {lightbox !== null && <Lightbox images={post.images} index={lightbox} onClose={() => setLightbox(null)} />}
        {!post.hiddenReason && (
          <footer className="mt-5 flex items-center justify-between gap-3 border-t border-line/70 pt-4">
            <ReactionBar postId={post.id} initial={post.reactions} />
            <span className="text-sm text-muted">{post.commentCount} comment{post.commentCount === 1 ? '' : 's'}</span>
          </footer>
        )}
      </article>

      <section className="card p-5 sm:p-6" aria-label="Comments">
        <h2 className="mb-4 font-serif text-xl font-medium">Comments</h2>
        {!post.hiddenReason && (
          <div id="comment" className="mb-6 scroll-mt-28">
            <CommentBox parentId={post.id} placeholder="Write a comment…" autoFocus={typeof window !== 'undefined' && window.location.hash === '#comment'} />
          </div>
        )}
        {post.replies.length ? (
          <ul className="space-y-4">
            {post.replies.map((c) => (
              <Comment key={c.id} c={c} depth={0} canModerate={canModerate} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No comments yet — start the conversation.</p>
        )}
      </section>
    </div>
  );
}
