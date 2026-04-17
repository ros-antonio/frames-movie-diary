import type { Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';

interface RealtimeEvent {
  type: string;
  payload?: unknown;
  timestamp: string;
}

let websocketServer: any = null;

export function initRealtime(server: HttpServer): void {
  if (websocketServer) {
    return;
  }

  websocketServer = new WebSocketServer({ server, path: '/realtime' });

  websocketServer.on('connection', (socket: any) => {
    const welcomeEvent: RealtimeEvent = {
      type: 'realtime.connected',
      timestamp: new Date().toISOString(),
    };
    socket.send(JSON.stringify(welcomeEvent));
  });
}

export function broadcastRealtime(type: string, payload?: unknown): void {
  if (!websocketServer) {
    return;
  }

  const message: RealtimeEvent = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };

  const encoded = JSON.stringify(message);
  for (const client of websocketServer.clients) {
    if (client.readyState === 1) {
      client.send(encoded);
    }
  }
}



