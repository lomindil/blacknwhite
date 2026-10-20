'use client';

import type { ReactionKind, Reactions } from '@bnw/shared';
import { useEffect, useState } from 'react';
import { call } from '@/lib/client-api';
import { IconHeartFill, IconThumb } from './icons';

const STYLE: Record<ReactionKind, { on: string; label: string }> = {
  like: { on: 'border-sky-200 bg-sky-50 text-sky-700', label: 'Like' },
  love: { on: 'border-rose-200 bg-rose-50 text-rose-600', label: 'Love' },
};

/** 👍 / ❤️ toggles with counts. Updates instantly, then reconciles with the server. */
export function ReactionBar({ postId, initial, size = 'md' }: { postId: string; initial: Reactions; size?: 'sm' | 'md' }) {
  const [r, setR] = useState(initial);
  const [pop, setPop] = useState<ReactionKind | null>(null);
  useEffect(() => setR(initial), [initial]);

  const toggle = async (kind: ReactionKind) => {
    const had = r.mine.includes(kind);
    setR({ ...r, [kind]: r[kind] + (had ? -1 : 1), mine: had ? r.mine.filter((k) => k !== kind) : [...r.mine, kind] });
    if (!had) {
      setPop(kind);
      setTimeout(() => setPop(null), 400);
    }
    try {
      setR(await call<Reactions>(`/v1/posts/${postId}/reactions`, { body: { kind } }));
    } catch {
      setR(r);
    }
  };

  const btn = size === 'sm' ? 'h-7 gap-1 px-2 text-xs' : 'h-8 gap-1.5 px-2.5 text-sm';
  const icon = size === 'sm' ? 14 : 16;
  return (
    <div className="flex items-center gap-1.5">
      {(['like', 'love'] as const).map((kind) => {
        const active = r.mine.includes(kind);
        const Icon = kind === 'like' ? IconThumb : IconHeartFill;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => toggle(kind)}
            aria-pressed={active}
            aria-label={`${STYLE[kind].label}${r[kind] ? ` (${r[kind]})` : ''}`}
            className={`inline-flex items-center rounded-full border font-medium tabular-nums transition ${btn} ${
              active ? STYLE[kind].on : 'border-line bg-surface text-muted hover:border-sage-200 hover:text-ink'
            }`}
          >
            <span className={`transition-transform duration-300 ${pop === kind ? 'scale-125' : 'scale-100'}`}>
              <Icon size={icon} filled={active} />
            </span>
            {r[kind] > 0 && <span>{r[kind]}</span>}
          </button>
        );
      })}
    </div>
  );
}
