import { useEffect } from 'react';

interface UseRealtimeSyncOptions {
  enabled: boolean;
  onServerDataChanged: () => void;
}

interface RealtimeMessage {
  type?: string;
}

function getRealtimeUrl(): string {
  const explicitUrl = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicitUrl) {
    return explicitUrl;
  }

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000/api';
  const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

  if (baseUrl.startsWith('https://')) {
    return `${baseUrl.replace('https://', 'wss://')}/realtime`;
  }

  return `${baseUrl.replace('http://', 'ws://')}/realtime`;
}

export function useRealtimeSync({ enabled, onServerDataChanged }: UseRealtimeSyncOptions): void {
  useEffect(() => {
    if (!enabled || import.meta.env.MODE === 'test') {
      return;
    }

    const socket = new WebSocket(getRealtimeUrl());

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as RealtimeMessage;
        if (parsed.type === 'movies.batchCreated') {
          onServerDataChanged();
        }
      } catch {
        // Ignore malformed events from non-matching senders.
      }
    };

    return () => {
      socket.close();
    };
  }, [enabled, onServerDataChanged]);
}

