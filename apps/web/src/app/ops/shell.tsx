'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { FormError } from '@/components/actions';
import { LogoMark } from '@/components/logo';
import { errorMessage } from '@/lib/client-api';
import { opsCall } from '@/lib/ops-client';

const NAV = [
  { href: '/ops', label: 'Overview' },
  { href: '/ops/users', label: 'Users' },
  { href: '/ops/clubs', label: 'Clubs' },
  { href: '/ops/blog', label: 'Blog review' },
  { href: '/ops/log', label: 'Activity log' },
];

export function OpsShell({ email, defaultPassword, children }: { email: string; defaultPassword: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col bg-[#22302A] text-white/80 lg:sticky lg:top-0 lg:h-screen lg:w-60">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <LogoMark size={28} />
          <div>
            <div className="font-serif text-lg leading-none text-white">Admin portal</div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-white/50">Restricted</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible" aria-label="Admin sections">
          {NAV.map((n) => {
            const active = n.href === '/ops' ? pathname === '/ops' : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-white/10 font-medium text-white' : 'hover:bg-white/5 hover:text-white'}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 text-xs lg:block">
          <div className="truncate text-white/60">{email}</div>
          <button
            type="button"
            className="mt-2 text-white/80 underline-offset-2 hover:underline"
            onClick={async () => {
              await opsCall('/logout', {}).catch(() => undefined);
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1 bg-paper">
        {defaultPassword && (
          <div className="border-b border-ochre-200 bg-ochre-50 px-6 py-2.5 text-sm text-ochre-800">
            Using the default admin password. Set <code className="rounded bg-white/60 px-1">OPS_EMAIL</code> and <code className="rounded bg-white/60 px-1">OPS_PASSWORD</code> in the API’s environment before going live.
          </div>
        )}
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

export function OpsLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#22302A] p-4">
      <form
        className="w-full max-w-sm animate-pop-in rounded-3xl bg-surface p-8 shadow-lift"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await opsCall('/login', { email, password });
            router.refresh();
          } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
          }
        }}
      >
        <div className="mb-6 flex items-center gap-2.5">
          <LogoMark size={30} />
          <div>
            <div className="font-serif text-xl">Admin portal</div>
            <div className="text-xs text-muted">Authorized staff only</div>
          </div>
        </div>
        <label className="label" htmlFor="ops-email">Email</label>
        <input id="ops-email" type="email" autoComplete="username" className="input mb-4" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="label" htmlFor="ops-password">Password</label>
        <input id="ops-password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <FormError error={error} />
        <button className="btn mt-6 w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="mt-4 text-center text-xs text-muted">All actions in the portal are logged.</p>
      </form>
    </div>
  );
}

/** Dialog-free confirm with a reason: deactivate a user, shut down a club, remove a post. */
export function ReasonAction({ label, path, danger = true, placeholder, done }: { label: string; path: string; danger?: boolean; placeholder: string; done?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open) {
    return (
      <button type="button" className={`btn-ghost btn-sm ${danger ? 'btn-danger' : ''}`} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <form
      className="flex w-full max-w-sm flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await opsCall(path, { reason });
          setOpen(false);
          router.refresh();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <input className="input py-1.5 text-sm" placeholder={placeholder} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus required minLength={3} />
      <div className="flex gap-2">
        <button className={`btn btn-sm ${danger ? 'bg-danger hover:bg-danger/90' : ''}`} disabled={busy}>{busy ? 'Working…' : (done ?? `Confirm ${label.toLowerCase()}`)}</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <FormError error={error} />
    </form>
  );
}

export function SimpleAction({ label, path, body = {} }: { label: string; path: string; body?: unknown }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await opsCall(path, body);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </button>
  );
}
