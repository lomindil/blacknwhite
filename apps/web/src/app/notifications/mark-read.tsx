'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { call } from '@/lib/client-api';

/** Opening the activity page marks everything read (after a moment, so unread dots are visible first). */
export function MarkAllRead({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!hasUnread) return;
    const t = setTimeout(async () => {
      await call('/v1/notifications/read', { body: {} }).catch(() => undefined);
      router.refresh();
    }, 2500);
    return () => clearTimeout(t);
  }, [hasUnread, router]);
  return null;
}
