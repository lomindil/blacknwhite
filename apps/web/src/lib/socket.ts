'use client';

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000', {
      path: '/ws',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

/** Join a room (thread:<id>, dm:<id>, club:<id>) and listen for events while mounted. */
export function useRoom(room: string | null, handlers: Record<string, (data: any) => void>) {
  useEffect(() => {
    const s = getSocket();
    const join = () => room && s.emit('join', { room });
    join();
    s.on('connect', join);
    for (const [event, fn] of Object.entries(handlers)) s.on(event, fn);
    return () => {
      s.off('connect', join);
      for (const [event, fn] of Object.entries(handlers)) s.off(event, fn);
      if (room) s.emit('leave', { room });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);
}
