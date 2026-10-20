'use client';

import { ApiError } from './client-api';

/** Browser calls to the admin portal API, with the portal's own CSRF token. */
export async function opsCall<T = unknown>(path: string, body?: unknown): Promise<T> {
  const csrf = document.cookie.match(/(?:^|;\s*)ocsrf=([^;]+)/)?.[1] ?? '';
  const res = await fetch(`/api/ops${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'x-csrf-token': decodeURIComponent(csrf) },
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new ApiError(res.status, b.code ?? 'ERROR', b.message ?? 'Something went wrong', b.details);
  }
  return res.json() as Promise<T>;
}
