import type { Me } from '@bnw/shared';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export class ServerApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Server-side fetch to the API, forwarding the visitor's cookies. */
export async function api<T>(path: string): Promise<T> {
  const jar = await cookies();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { cookie: jar.toString(), accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ServerApiError(res.status, body.code ?? 'ERROR', body.message ?? res.statusText, body.details);
  }
  return res.json() as Promise<T>;
}

/** Like api(), but 404 → Next's not-found page and 401 → login. */
export async function apiOrNotFound<T>(path: string, nextPath?: string): Promise<T> {
  try {
    return await api<T>(path);
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 404) notFound();
    if (e instanceof ServerApiError && e.status === 401) redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`);
    throw e;
  }
}

/** The signed-in user, or null. Cached for the request. */
export const getMe = cache(async (): Promise<Me | null> => {
  const jar = await cookies();
  if (!jar.get('sid')) return null;
  try {
    return await api<Me>('/v1/me');
  } catch {
    return null;
  }
});

/** Requires sign-in (and onboarding), redirecting otherwise. */
export async function requireMe(nextPath: string): Promise<Me> {
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!me.onboarded) redirect('/onboarding');
  return me;
}
