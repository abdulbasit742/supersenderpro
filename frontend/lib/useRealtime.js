'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from './api';

export default function useRealtime(events = [], onEvent) {
  const [status, setStatus] = useState('offline');
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    const socket = io(API_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10
    });

    socket.on('connect', () => setStatus('live'));
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('system:ready', (payload) => {
      setStatus('live');
      setLastEvent({ event: 'system:ready', payload, at: new Date().toISOString() });
    });

    events.forEach((eventName) => {
      socket.on(eventName, (payload) => {
        const item = { event: eventName, payload, at: new Date().toISOString() };
        setLastEvent(item);
        if (onEvent) onEvent(item);
      });
    });

    return () => socket.disconnect();
  }, []);

  return { status, lastEvent };
}
