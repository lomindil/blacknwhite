'use client';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } & Record<string, unknown>,
  ) {
    super(message);
  }

  /** First field error, for showing under a form. */
  get fieldMessage(): string {
    const fe = this.details?.fieldErrors;
    if (fe) {
      const [field, msgs] = Object.entries(fe)[0] ?? [];
      if (field && msgs?.length) return `${field}: ${msgs[0]}`;
    }
    return this.details?.formErrors?.[0] ?? this.message;
  }
}

function csrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

/** Browser-side API call through the same-origin /api proxy, with the CSRF header. */
export async function call<T = unknown>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const method = init.method ?? (init.body || init.form ? 'POST' : 'GET');
  const headers: Record<string, string> = { accept: 'application/json' };
  if (method !== 'GET') headers['x-csrf-token'] = csrfToken();
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.code ?? 'ERROR', body.message ?? 'Something went wrong', body.details);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.code === 'VALIDATION_ERROR' ? e.fieldMessage : e.message;
  return 'Something went wrong. Please try again.';
}
