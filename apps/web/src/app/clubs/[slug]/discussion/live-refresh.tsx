'use client';

import { useRouter } from 'next/navigation';
import { useRoom } from '@/lib/socket';

/** Re-renders the server page when a realtime event arrives in the room. */
export function LiveRefresh({ room, event }: { room: string; event: string }) {
  const router = useRouter();
  useRoom(room, { [event]: () => router.refresh() });
  return null;
}
