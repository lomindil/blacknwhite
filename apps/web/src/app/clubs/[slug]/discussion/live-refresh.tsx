'use client';

import { useRouter } from 'next/navigation';
import { useRoom } from '@/lib/socket';

/** Re-renders the server page when any of the given realtime events arrives in the room. */
export function LiveRefresh({ room, event }: { room: string; event: string | string[] }) {
  const router = useRouter();
  const events = Array.isArray(event) ? event : [event];
  useRoom(room, Object.fromEntries(events.map((e) => [e, () => router.refresh()])));
  return null;
}
