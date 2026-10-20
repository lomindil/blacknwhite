'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { call, errorMessage } from '@/lib/client-api';

export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-danger">
      {error}
    </p>
  );
}

/** A button that calls the API, then refreshes the page (or navigates). */
export function ActionButton({
  path,
  method = 'POST',
  body,
  children,
  className = 'btn',
  confirm,
  redirectTo,
}: {
  path: string;
  method?: string;
  body?: unknown;
  children: ReactNode;
  className?: string;
  confirm?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setError(null);
          try {
            await call(path, { method, body: body ?? {} });
            if (redirectTo) router.push(redirectTo);
            router.refresh();
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {children}
      </button>
      <FormError error={error} />
    </span>
  );
}

const REASONS = [
  ['spam', 'Spam'],
  ['harassment', 'Harassment or bullying'],
  ['hate', 'Hate speech'],
  ['sexual', 'Sexual content'],
  ['spoiler', 'Unmarked spoiler'],
  ['impersonation', 'Impersonation'],
  ['other', 'Something else'],
] as const;

export function ReportButton({ targetType, targetId, label = 'Report' }: { targetType: string; targetId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('spam');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (state === 'done') return <span className="text-xs text-muted">Reported. Thank you.</span>;
  if (!open)
    return (
      <button type="button" className="text-xs text-muted hover:text-ink hover:underline" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  return (
    <div className="mt-2 w-full max-w-sm border border-line bg-paper p-3 text-sm">
      <label className="label" htmlFor={`r-${targetId}`}>
        Why are you reporting this?
      </label>
      <select id={`r-${targetId}`} className="input mb-2" value={reason} onChange={(e) => setReason(e.target.value)}>
        {REASONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <textarea className="input mb-2" rows={2} placeholder="Anything else we should know? (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-sm"
          disabled={state === 'busy'}
          onClick={async () => {
            setState('busy');
            try {
              await call('/v1/reports', { body: { targetType, targetId, reason, details: details || undefined } });
              setState('done');
            } catch (e) {
              setError(errorMessage(e));
              setState('idle');
            }
          }}
        >
          Send report
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <FormError error={error} />
    </div>
  );
}
