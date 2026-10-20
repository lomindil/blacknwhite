'use client';

import type { SeriesPoint } from '@bnw/shared';
import { useState } from 'react';

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}K` : String(n));
const shortDate = (d: string) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/**
 * Single-series daily column chart (one hue, no legend — the title names the series).
 * Thin columns with 4px rounded tops, 2px gaps, hairline grid, per-column hover tooltip,
 * and a table view for screen readers and exact values.
 */
export function DailyBars({ title, subtitle, data, total }: { title: string; subtitle: string; data: SeriesPoint[]; total?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];
  const last = data[data.length - 1];

  return (
    <figure className="card">
      <figcaption className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted">{subtitle}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums">{total ?? compact(last?.value ?? 0)}</div>
          <div className="text-xs text-muted">{total ? 'last 30 days' : 'today'}</div>
        </div>
      </figcaption>
      <div className="relative flex h-44 gap-2" aria-hidden>
        <div className="flex w-7 flex-col justify-between text-right text-[10px] tabular-nums text-muted">
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{compact(t)}</span>)}
        </div>
        <div className="relative flex-1">
          {ticks.map((t, i) => (
            <div key={t} className="absolute inset-x-0 border-t border-line" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <div key={d.date} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)}>
                <div
                  className={`w-full max-w-[24px] rounded-t-[4px] transition-colors ${hover === i ? 'bg-sage-800' : 'bg-sage-600'}`}
                  style={{ height: d.value ? `max(${(d.value / max) * 100}%, 2px)` : '0' }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lift">
                    <div className="font-semibold tabular-nums">{d.value.toLocaleString('en-IN')}</div>
                    <div className="text-white/70">{shortDate(d.date)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-9 mt-2 flex justify-between text-[10px] text-muted" aria-hidden>
        <span>{data[0] && shortDate(data[0].date)}</span>
        <span>{data[Math.floor(data.length / 2)] && shortDate(data[Math.floor(data.length / 2)].date)}</span>
        <span>{last && shortDate(last.date)}</span>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted hover:text-ink">View as table</summary>
        <table className="mt-2 w-full tabular-nums">
          <thead><tr className="text-left text-muted"><th className="py-1 font-medium">Date</th><th className="py-1 text-right font-medium">{title}</th></tr></thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.date} className="border-t border-line/70"><td className="py-1">{shortDate(d.date)}</td><td className="py-1 text-right">{d.value}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
