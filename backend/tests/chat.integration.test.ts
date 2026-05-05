import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_OTHER_USER_ID, app, authHeader, createTestUser, resetStore } from './testUtils.js';
import { chatService } from '../src/services/chatService.js';

describe('chat API', () => {
  beforeEach(async () => {
    await resetStore();
    vi.restoreAllMocks();
    await createTestUser({
      id: TEST_OTHER_USER_ID,
      email: 'other@example.com',
      name: 'Other User',
    });
  });

  it('returns recent direct chat messages for authenticated users', async () => {
    vi.spyOn(chatService, 'listConversationMessages').mockResolvedValue([
      {
        id: 'msg-1',
        conversationId: 'test-user-123:test-user-456',
        senderUserId: 'test-user-123',
        senderName: 'Integration Test User',
        senderRole: 'USER',
        recipientUserId: 'test-user-456',
        text: 'Hello from Mongo-backed chat',
        createdAt: '2026-05-05T18:00:00.000Z',
      },
    ]);

    const response = await request(app)
      .get(`/api/chat/messages/${TEST_OTHER_USER_ID}`)
      .set(authHeader());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        id: 'msg-1',
        conversationId: 'test-user-123:test-user-456',
        senderName: 'Integration Test User',
        text: 'Hello from Mongo-backed chat',
      }),
    ]);
  });

  it('lists available direct-chat users for authenticated users', async () => {
    const response = await request(app)
      .get('/api/chat/users')
      .set(authHeader());

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: TEST_OTHER_USER_ID,
          email: 'other@example.com',
          role: 'USER',
        }),
      ]),
    );
  });

  it('requires authentication for chat history', async () => {
    const response = await request(app).get(`/api/chat/messages/${TEST_OTHER_USER_ID}`);

    expect(response.status).toBe(401);
  });
});
