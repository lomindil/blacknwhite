'use client';

import type { BlogDetail, MediaInfo } from '@bnw/shared';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { FormError } from '@/components/actions';
import { BlogMarkdown } from '@/components/blog-markdown';
import { call, errorMessage } from '@/lib/client-api';

const REVIEW_DAYS = 7;

async function upload(file: File): Promise<MediaInfo> {
  const form = new FormData();
  form.append('file', file);
  return call<MediaInfo>('/v1/media', { form });
}

export function BlogEditor({ post, accountCreatedAt }: { post?: BlogDetail; accountCreatedAt: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt && post.excerpt !== '' ? post.excerpt : '');
  const [body, setBody] = useState(post?.body ?? '');
  const [tags, setTags] = useState<string[]>(post?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [cover, setCover] = useState<MediaInfo | null>(post?.cover ?? null);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [busy, setBusy] = useState<false | 'draft' | 'publish' | 'cover' | 'photo'>(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const isNewAccount = Date.now() - new Date(accountCreatedAt).getTime() < REVIEW_DAYS * 86400000;
  const published = post?.status === 'published';
  const words = body.split(/\s+/).filter(Boolean).length;

  const wrap = (before: string, after = before, placeholder = 'text') => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = body.slice(s, e) || placeholder;
    const next = body.slice(0, s) + before + selected + after + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  };
  const linePrefix = (prefix: string) => {
    const el = area.current;
    if (!el) return;
    const start = body.lastIndexOf('\n', el.selectionStart - 1) + 1;
    setBody(body.slice(0, start) + prefix + body.slice(start));
    requestAnimationFrame(() => el.focus());
  };
  const insertAtCursor = (text: string) => {
    const el = area.current;
    const at = el ? el.selectionStart : body.length;
    setBody(body.slice(0, at) + text + body.slice(at));
  };

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, '');
    if (t.length >= 2 && !tags.includes(t) && tags.length < 5) setTags([...tags, t]);
    setTagInput('');
  };

  const save = async (publish: boolean) => {
    setBusy(publish ? 'publish' : 'draft');
    setError(null);
    try {
      const payload = { title, excerpt: excerpt || undefined, body, tags, coverMediaId: cover?.id ?? null, publish };
      const saved = post
        ? await call<BlogDetail>(`/v1/blog/${post.id}`, { method: 'PUT', body: payload })
        : await call<BlogDetail>('/v1/blog', { body: payload });
      router.push(saved.status === 'published' || saved.status === 'pending' ? `/blog/${saved.slug}` : `/blog/${saved.slug}/edit?saved=1`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const tool = 'rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:bg-soft hover:text-ink';

  return (
    <div className="mx-auto max-w-3xl">
      {/* Cover */}
      <input ref={coverInput} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setBusy('cover');
        try { setCover(await upload(f)); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
      }} />
      {cover ? (
        <div className="group relative mb-6 overflow-hidden rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover.url} alt="" className="aspect-[16/8] w-full object-cover" />
          <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
            <button type="button" className="btn-ghost btn-sm" onClick={() => coverInput.current?.click()}>Change</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setCover(null)}>Remove</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => coverInput.current?.click()}
          className="mb-6 flex aspect-[16/6] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-surface text-muted transition hover:border-sage-300 hover:bg-sage-50/50 hover:text-sage-700"
        >
          {busy === 'cover' ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-sage-600 border-t-transparent" /> : <>
            <span className="text-sm font-medium">Add a cover photo</span>
            <span className="mt-1 text-xs">Optional · location data is removed</span>
          </>}
        </button>
      )}

      {/* Title and summary */}
      <textarea
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          e.currentTarget.style.height = 'auto';
          e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
        }}
        placeholder="Title"
        aria-label="Title"
        rows={1}
        maxLength={150}
        className="w-full resize-none bg-transparent font-serif text-4xl font-medium leading-tight tracking-tight outline-none placeholder:text-muted/50 sm:text-5xl"
      />
      <input
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        placeholder="A one-line summary (optional — shown on cards)"
        aria-label="Summary"
        maxLength={300}
        className="mt-3 w-full bg-transparent text-xl text-muted outline-none placeholder:text-muted/50"
      />

      {/* Tags */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2.5 py-1 text-xs font-medium text-sage-700">
            #{t}
            <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`} className="text-sage-600 hover:text-ink">×</button>
          </span>
        ))}
        {tags.length < 5 && (
          <input
            value={tagInput}
            onChange={(e) => (e.target.value.endsWith(',') ? addTag(e.target.value.slice(0, -1)) : setTagInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag(tagInput);
              }
              if (e.key === 'Backspace' && !tagInput && tags.length) setTags(tags.slice(0, -1));
            }}
            onBlur={() => tagInput && addTag(tagInput)}
            placeholder={tags.length ? 'Add tag' : 'Add up to 5 tags — e.g. reading list, kannada, club stories'}
            aria-label="Tags"
            className="min-w-[12rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted/60"
          />
        )}
      </div>

      {/* Body */}
      <div className="card mt-6 p-0">
        <div className="flex flex-wrap items-center gap-1 border-b border-line/70 px-3 py-2">
          <div className="mr-2 flex rounded-full bg-soft p-0.5 text-sm">
            {(['write', 'preview'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full px-3 py-1 capitalize transition ${tab === t ? 'bg-surface font-medium shadow-sm' : 'text-muted'}`}>
                {t}
              </button>
            ))}
          </div>
          {tab === 'write' && (
            <>
              <button type="button" className={tool} onClick={() => linePrefix('## ')} title="Heading">H</button>
              <button type="button" className={`${tool} font-bold`} onClick={() => wrap('**')} title="Bold">B</button>
              <button type="button" className={`${tool} italic`} onClick={() => wrap('_')} title="Italic">I</button>
              <button type="button" className={tool} onClick={() => linePrefix('> ')} title="Quote">“ ”</button>
              <button type="button" className={tool} onClick={() => linePrefix('- ')} title="List">• List</button>
              <button type="button" className={tool} onClick={() => wrap('[', '](https://)', 'link text')} title="Link">Link</button>
              <button type="button" className={tool} onClick={() => photoInput.current?.click()} title="Insert photo">
                {busy === 'photo' ? 'Uploading…' : 'Insert photo'}
              </button>
              <input ref={photoInput} type="file" accept="image/*" hidden onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                setBusy('photo');
                try {
                  const m = await upload(f);
                  insertAtCursor(`\n\n![Caption](${m.url})\n\n`);
                } catch (err) {
                  setError(errorMessage(err));
                } finally {
                  setBusy(false);
                }
              }} />
            </>
          )}
        </div>
        {tab === 'write' ? (
          <textarea
            ref={area}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tell your story… Markdown works: ## headings, **bold**, > quotes, - lists."
            aria-label="Post body"
            className="min-h-[28rem] w-full resize-y bg-transparent px-5 py-4 text-[17px] leading-relaxed outline-none placeholder:text-muted/60"
          />
        ) : (
          <div className="min-h-[28rem] px-6 py-5">{body.trim() ? <BlogMarkdown text={body} /> : <p className="text-muted">Nothing to preview yet.</p>}</div>
        )}
      </div>

      <FormError error={error} />
      <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/95 py-4 backdrop-blur">
        <span className="text-sm text-muted">
          {words} words · {Math.max(1, Math.round(words / 200))} min read
          {isNewAccount && !published && <span className="ml-2 text-ochre-700">· New accounts’ posts are reviewed before they go live</span>}
        </span>
        <div className="flex gap-2">
          {!published && (
            <button type="button" className="btn-ghost" disabled={Boolean(busy)} onClick={() => save(false)}>
              {busy === 'draft' ? 'Saving…' : 'Save draft'}
            </button>
          )}
          <button type="button" className="btn" disabled={Boolean(busy) || title.trim().length < 5 || !body.trim()} onClick={() => save(true)}>
            {busy === 'publish' ? 'Publishing…' : published ? 'Update post' : isNewAccount ? 'Submit for review' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
