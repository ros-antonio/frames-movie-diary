import { createServer, type Server } from 'node:http';
import { WebSocket, type WebSocketServer } from 'ws';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closeMongoClient } from '../src/repositories/mongoClient.js';
import { prisma } from '../src/repositories/prismaClient.js';
import { setupChatWebSocketServer } from '../src/websocket/chatServer.js';
import {
  TEST_ADMIN_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  authHeader,
  createTestUser,
  resetStore,
} from './testUtils.js';

function getTokenFromAuthHeader(header: { Authorization: string }) {
  return header.Authorization.replace('Bearer ', '');
}

function waitForSocketOpen(socket: WebSocket) {
  return new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });
}

function waitForSocketMessage(socket: WebSocket) {
  return new Promise<string>((resolve, reject) => {
    socket.once('message', (rawMessage) => resolve(rawMessage.toString()));
    socket.once('error', reject);
  });
}

function waitForUnexpectedResponse(socket: WebSocket) {
  return new Promise<number>((resolve, reject) => {
    socket.once('unexpected-response', (_request, response) => resolve(response.statusCode ?? 0));
    socket.once('error', reject);
  });
}

async function closeSocket(socket: WebSocket) {
  if (socket.readyState === WebSocket.CLOSED) {
    return;
  }

  await new Promise<void>((resolve) => {
    socket.once('close', () => resolve());
    socket.close();
  });
}

describe('chat websocket server', () => {
  let server: Server;
  let wsServer: WebSocketServer;
  let serverUrl = '';
  const sockets: WebSocket[] = [];

  beforeEach(async () => {
    await resetStore();
    await createTestUser({
      id: TEST_OTHER_USER_ID,
      email: 'other@example.com',
      name: 'Other User',
    });

    server = createServer(createApp());
    wsServer = setupChatWebSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Could not determine WebSocket test server address');
    }

    serverUrl = `ws://127.0.0.1:${address.port}/ws/chat`;
  });

  afterEach(async () => {
    await Promise.all(sockets.map((socket) => closeSocket(socket).catch(() => undefined)));
    sockets.length = 0;

    await new Promise<void>((resolve) => wsServer.close(() => resolve()));
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  afterAll(async () => {
    await closeMongoClient();
  });

  it('rejects websocket connections without an auth token', async () => {
    const socket = new WebSocket(serverUrl);
    sockets.push(socket);

    await expect(waitForUnexpectedResponse(socket)).resolves.toBe(401);
  });

  it('broadcasts private messages only to the sender and selected recipient', async () => {
    const sender = new WebSocket(serverUrl, {
      headers: { Authorization: `Bearer ${getTokenFromAuthHeader(authHeader(TEST_USER_ID, 'USER'))}` },
    });
    const recipient = new WebSocket(serverUrl, {
      headers: { Authorization: `Bearer ${getTokenFromAuthHeader(authHeader(TEST_OTHER_USER_ID, 'USER'))}` },
    });
    const unrelated = new WebSocket(serverUrl, {
      headers: { Authorization: `Bearer ${getTokenFromAuthHeader(authHeader(TEST_ADMIN_ID, 'ADMIN'))}` },
    });
    sockets.push(sender, recipient, unrelated);

    await Promise.all([
      waitForSocketOpen(sender),
      waitForSocketOpen(recipient),
      waitForSocketOpen(unrelated),
    ]);

    const senderMessage = waitForSocketMessage(sender);
    const recipientMessage = waitForSocketMessage(recipient);
    let unrelatedReceived = false;
    unrelated.once('message', () => {
      unrelatedReceived = true;
    });

    sender.send(JSON.stringify({
      type: 'send_message',
      recipientUserId: TEST_OTHER_USER_ID,
      text: '  Private hello over websocket  ',
    }));

    const [senderPayload, recipientPayload] = await Promise.all([senderMessage, recipientMessage]);

    expect(JSON.parse(senderPayload)).toEqual({
      type: 'chat_message',
      message: expect.objectContaining({
        conversationId: [TEST_OTHER_USER_ID, TEST_USER_ID].sort().join(':'),
        senderUserId: TEST_USER_ID,
        recipientUserId: TEST_OTHER_USER_ID,
        senderName: 'Integration Test User',
        senderRole: 'USER',
        text: 'Private hello over websocket',
      }),
    });
    expect(JSON.parse(recipientPayload)).toEqual(JSON.parse(senderPayload));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(unrelatedReceived).toBe(false);

    await expect(prisma.auditLog.findFirst({
      where: {
        userId: TEST_USER_ID,
        actionType: 'CHAT_SEND_MESSAGE',
      },
    })).resolves.toEqual(expect.objectContaining({
      entityType: 'CHAT_MESSAGE',
      details: `Sent direct chat message to ${TEST_OTHER_USER_ID}`,
      roleName: 'USER',
    }));
  });

  it('returns an error event for invalid websocket chat payloads', async () => {
    const sender = new WebSocket(serverUrl, {
      headers: { Authorization: `Bearer ${getTokenFromAuthHeader(authHeader(TEST_USER_ID, 'USER'))}` },
    });
    sockets.push(sender);

    await waitForSocketOpen(sender);

    sender.send(JSON.stringify({
      type: 'send_message',
      recipientUserId: '',
      text: 'hello',
    }));
    await expect(waitForSocketMessage(sender)).resolves.toBe(JSON.stringify({
      type: 'error',
      message: 'Recipient is required for direct chat.',
    }));

    sender.send(JSON.stringify({
      type: 'send_message',
      recipientUserId: TEST_OTHER_USER_ID,
      text: 'x'.repeat(501),
    }));
    await expect(waitForSocketMessage(sender)).resolves.toBe(JSON.stringify({
      type: 'error',
      message: 'Message must be 500 characters or fewer.',
    }));

    sender.send(JSON.stringify({
      type: 'ping',
      recipientUserId: TEST_OTHER_USER_ID,
      text: 'hello',
    }));
    await expect(waitForSocketMessage(sender)).resolves.toBe(JSON.stringify({
      type: 'error',
      message: 'Unsupported chat message type.',
    }));

    sender.send(JSON.stringify({
      type: 'send_message',
      recipientUserId: TEST_OTHER_USER_ID,
      text: '   ',
    }));
    await expect(waitForSocketMessage(sender)).resolves.toBe(JSON.stringify({
      type: 'error',
      message: 'Message cannot be empty.',
    }));

    sender.send('{"type":"send_message"');
    await expect(waitForSocketMessage(sender)).resolves.toBe(JSON.stringify({
      type: 'error',
      message: 'Invalid chat payload.',
    }));
  });
});
