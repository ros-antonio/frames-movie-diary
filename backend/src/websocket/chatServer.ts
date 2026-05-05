import type { IncomingMessage } from 'node:http';
import type { Server } from 'node:http';
import { WebSocketServer } from 'ws';
import type WebSocket from 'ws';
import type { RawData } from 'ws';
import { prisma } from '../repositories/prismaClient.js';
import { verifyAuthToken, extractAuthTokenFromHeaders } from '../utils/authToken.js';
import { chatService } from '../services/chatService.js';
import { auditLogService } from '../services/auditLogService.js';

interface ChatSocketState {
  userId: string;
  role: string;
  name: string;
}

interface ChatClientMessage {
  type: 'send_message';
  recipientUserId: string;
  text: string;
}

function sendJson(socket: WebSocket, payload: unknown) {
  socket.send(JSON.stringify(payload));
}

async function authenticateSocket(request: IncomingMessage): Promise<ChatSocketState> {
  const token = extractAuthTokenFromHeaders(request.headers);

  if (!token) {
    throw new Error('Missing auth token');
  }

  const decoded = verifyAuthToken(token);
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    userId: user.id,
    role: user.role.name,
    name: user.name,
  };
}

export function setupChatWebSocketServer(server: Server) {
  const wsServer = new WebSocketServer({ noServer: true });
  const socketsByUserId = new Map<string, Set<WebSocket>>();

  server.on('upgrade', async (request, socket, head) => {
    const requestUrl = request.url ?? '';

    if (!requestUrl.startsWith('/ws/chat')) {
      return;
    }

    try {
      const chatUser = await authenticateSocket(request);

      wsServer.handleUpgrade(request, socket, head, (connection: WebSocket) => {
        wsServer.emit('connection', connection, request, chatUser);
      });
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  wsServer.on('connection', async (connection: WebSocket, _request: IncomingMessage, chatUser: ChatSocketState) => {
    const userSockets = socketsByUserId.get(chatUser.userId) ?? new Set<WebSocket>();
    userSockets.add(connection);
    socketsByUserId.set(chatUser.userId, userSockets);

    connection.on('message', async (rawMessage: RawData) => {
      try {
        const payload = JSON.parse(rawMessage.toString()) as ChatClientMessage;

        if (payload.type !== 'send_message') {
          sendJson(connection, {
            type: 'error',
            message: 'Unsupported chat message type.',
          });
          return;
        }

        const text = chatService.normalizeMessageText(payload.text);
        const recipientUserId = payload.recipientUserId?.trim();

        if (!text) {
          sendJson(connection, {
            type: 'error',
            message: 'Message cannot be empty.',
          });
          return;
        }

        if (text.length > 500) {
          sendJson(connection, {
            type: 'error',
            message: 'Message must be 500 characters or fewer.',
          });
          return;
        }

        if (!recipientUserId) {
          sendJson(connection, {
            type: 'error',
            message: 'Recipient is required for direct chat.',
          });
          return;
        }

        const message = await chatService.createMessage({
          senderUserId: chatUser.userId,
          senderName: chatUser.name,
          senderRole: chatUser.role,
          recipientUserId,
          text,
        });

        await auditLogService.log({
          userId: chatUser.userId,
          roleName: chatUser.role,
          actionType: 'CHAT_SEND_MESSAGE',
          entityType: 'CHAT_MESSAGE',
          entityId: message.id,
          details: `Sent direct chat message to ${recipientUserId}`,
        });

        const eventPayload = JSON.stringify({
          type: 'chat_message',
          message,
        });

        const recipients = new Set([
          ...(socketsByUserId.get(chatUser.userId) ?? []),
          ...(socketsByUserId.get(recipientUserId) ?? []),
        ]);

        recipients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(eventPayload);
          }
        });
      } catch {
        sendJson(connection, {
          type: 'error',
          message: 'Invalid chat payload.',
        });
      }
    });

    connection.on('close', () => {
      const sockets = socketsByUserId.get(chatUser.userId);
      if (!sockets) {
        return;
      }

      sockets.delete(connection);

      if (sockets.size === 0) {
        socketsByUserId.delete(chatUser.userId);
      }
    });
  });

  return wsServer;
}
