// useWebSocket.js – React hook for WebSocket connections
import { useEffect, useState } from 'react';

export default function useWebSocket(url) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);
    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => {
      try {
        setData(JSON.parse(event.data));
      } catch (_) {
        setData(event.data);
      }
    };
    ws.onclose = () => setConnected(false);
    return () => ws.close();
  }, [url]);

  return { data, connected };
}
