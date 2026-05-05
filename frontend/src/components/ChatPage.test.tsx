import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPage } from './ChatPage';
import { movieDiaryApi } from '../api/movieDiaryApi';
import type { ChatMessage, ChatUser } from '../types';

type MockWebSocketEventMap = {
  open: Event;
  close: CloseEvent;
  message: MessageEvent<string>;
};

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;

  readyState = MockWebSocket.OPEN;
  sentMessages: string[] = [];
  private listeners: {
    [K in keyof MockWebSocketEventMap]?: Array<(event: MockWebSocketEventMap[K]) => void>;
  } = {};

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener<K extends keyof MockWebSocketEventMap>(
    type: K,
    listener: (event: MockWebSocketEventMap[K]) => void,
  ) {
    const current = this.listeners[type] ?? [];
    current.push(listener);
    this.listeners[type] = current;
  }

  send(payload: string) {
    this.sentMessages.push(payload);
  }

  close() {
    this.emit('close', new CloseEvent('close'));
  }

  emit<K extends keyof MockWebSocketEventMap>(type: K, event: MockWebSocketEventMap[K]) {
    (this.listeners[type] ?? []).forEach((listener) => listener(event));
  }
}

describe('ChatPage', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    localStorage.setItem('userId', 'user-1');
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    const chatUsers: ChatUser[] = [
      {
        id: 'user-2',
        name: 'Other User',
        email: 'other@example.com',
        role: 'USER',
      },
    ];
    const chatMessages: ChatMessage[] = [
      {
        id: 'msg-1',
        conversationId: 'user-1:user-2',
        senderUserId: 'user-2',
        senderName: 'Other User',
        senderRole: 'USER',
        recipientUserId: 'user-1',
        text: 'Hello from another browser',
        createdAt: '2026-05-05T18:00:00.000Z',
      },
    ];

    vi.spyOn(movieDiaryApi, 'getChatUsers').mockResolvedValue(chatUsers);
    vi.spyOn(movieDiaryApi, 'getChatMessages').mockResolvedValue(chatMessages);
  });

  afterEach(() => {
    MockWebSocket.instances = [];
    globalThis.WebSocket = originalWebSocket;
  });

  it('renders websocket chat history and sends messages', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(<ChatPage onBack={onBack} />);

    const socket = MockWebSocket.instances[0];
    expect(socket.url).toContain('/ws/chat');
    expect(await screen.findByPlaceholderText(/private message/i)).toBeInTheDocument();

    await act(async () => {
      socket.emit('open', new Event('open'));
    });

    expect(await screen.findByText('Hello from another browser')).toBeInTheDocument();
    expect(await screen.findByText('other@example.com')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/private message/i), 'Hi there!');
    await user.click(screen.getByRole('button', { name: /Send/i }));

    expect(socket.sentMessages).toHaveLength(1);
    expect(JSON.parse(socket.sentMessages[0] ?? '{}')).toEqual({
      type: 'send_message',
      recipientUserId: 'user-2',
      text: 'Hi there!',
    });
  });

  it('renders incoming private messages and supports going back', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(<ChatPage onBack={onBack} />);

    const socket = MockWebSocket.instances[0];
    expect(await screen.findByPlaceholderText(/private message/i)).toBeInTheDocument();

    await act(async () => {
      socket.emit('open', new Event('open'));
      socket.emit('message', {
        data: JSON.stringify({
          type: 'chat_message',
          message: {
            id: 'msg-2',
            conversationId: 'user-1:user-2',
            senderUserId: 'user-2',
            senderName: 'Other User',
            senderRole: 'USER',
            recipientUserId: 'user-1',
            text: 'Reply in private',
            createdAt: '2026-05-05T18:10:00.000Z',
          },
        }),
      } as MessageEvent<string>);
    });

    expect(await screen.findByText('Reply in private')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Back to Diary/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
