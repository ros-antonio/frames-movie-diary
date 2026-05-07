import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPage } from './ChatPage';
import { movieDiaryApi } from '../api/movieDiaryApi';
import type { ChatMessage, ChatUser } from '../types';

type MockWebSocketEventMap = {
  open: Event;
  close: CloseEvent;
  error: Event;
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
  const chatUsers: ChatUser[] = [
    {
      id: 'user-2',
      name: 'Other User',
      email: 'other@example.com',
      role: 'USER',
    },
    {
      id: 'user-3',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN',
    },
  ];
  const chatMessagesByUserId: Record<string, ChatMessage[]> = {
    'user-2': [
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
    ],
    'user-3': [
      {
        id: 'msg-9',
        conversationId: 'user-1:user-3',
        senderUserId: 'user-3',
        senderName: 'Admin User',
        senderRole: 'ADMIN',
        recipientUserId: 'user-1',
        text: 'Admin thread message',
        createdAt: '2026-05-05T18:05:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    localStorage.setItem('userId', 'user-1');
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;

    vi.spyOn(movieDiaryApi, 'getChatUsers').mockResolvedValue(chatUsers);
    vi.spyOn(movieDiaryApi, 'getChatMessages').mockImplementation(async (otherUserId: string) => (
      chatMessagesByUserId[otherUserId] ?? []
    ));
  });

  afterEach(() => {
    MockWebSocket.instances = [];
    globalThis.WebSocket = originalWebSocket;
    vi.useRealTimers();
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

  it('switches between private conversations and ignores messages for other users', async () => {
    const user = userEvent.setup();

    render(<ChatPage onBack={vi.fn()} />);

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.emit('open', new Event('open'));
    });

    expect(await screen.findByText('Hello from another browser')).toBeInTheDocument();
    expect(movieDiaryApi.getChatMessages).toHaveBeenCalledWith('user-2');

    await user.click(screen.getByRole('button', { name: /Admin User/i }));

    expect(await screen.findByText('Admin thread message')).toBeInTheDocument();
    expect(movieDiaryApi.getChatMessages).toHaveBeenCalledWith('user-3');

    await act(async () => {
      socket.emit('message', {
        data: JSON.stringify({
          type: 'chat_message',
          message: {
            id: 'msg-ignored',
            conversationId: 'user-1:user-2',
            senderUserId: 'user-2',
            senderName: 'Other User',
            senderRole: 'USER',
            recipientUserId: 'user-1',
            text: 'Should stay hidden',
            createdAt: '2026-05-05T18:20:00.000Z',
          },
        }),
      } as MessageEvent<string>);
    });

    expect(screen.queryByText('Should stay hidden')).not.toBeInTheDocument();
    expect(screen.getByText('Admin thread message')).toBeInTheDocument();
  });

  it('submits on Enter, keeps Shift+Enter as newline, and surfaces disconnects after the grace period', async () => {
    const user = userEvent.setup();

    render(<ChatPage onBack={vi.fn()} />);

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.emit('open', new Event('open'));
    });

    const composer = await screen.findByPlaceholderText(/private message/i);
    await user.type(composer, 'Line one');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(composer).toHaveValue('Line one\n');

    await user.type(composer, 'Line two');
    await user.keyboard('{Enter}');

    expect(socket.sentMessages).toHaveLength(1);
    expect(JSON.parse(socket.sentMessages[0] ?? '{}')).toEqual({
      type: 'send_message',
      recipientUserId: 'user-2',
      text: 'Line one\nLine two',
    });

    vi.useFakeTimers();

    await act(async () => {
      socket.emit('close', new CloseEvent('close'));
      vi.advanceTimersByTime(599);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Chat connection was lost.');
  });

  it('renders empty and error states for unavailable chat users and conversations', async () => {
    vi.spyOn(movieDiaryApi, 'getChatUsers').mockResolvedValue([]);

    render(<ChatPage onBack={vi.fn()} />);

    expect(await screen.findByText(/No other users are available for private chat yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Select a person to open a direct message thread/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Choose a user before sending a message/i)).toBeInTheDocument();
  });

  it('falls back to generic loader errors and ignores incoming messages before a chat is selected', async () => {
    vi.spyOn(movieDiaryApi, 'getChatUsers').mockRejectedValue('no users available');

    render(<ChatPage onBack={vi.fn()} />);

    const socket = MockWebSocket.instances[0];
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load chat users.');

    await act(async () => {
      socket.emit('open', new Event('open'));
      socket.emit('message', {
        data: JSON.stringify({
          type: 'chat_message',
          message: {
            id: 'msg-unselected',
            conversationId: 'user-1:user-9',
            senderUserId: 'user-9',
            senderName: 'Unselected User',
            senderRole: 'USER',
            recipientUserId: 'user-1',
            text: 'Should be ignored until a chat is selected',
            createdAt: '2026-05-05T19:00:00.000Z',
          },
        }),
      } as MessageEvent<string>);
    });

    expect(screen.queryByText('Should be ignored until a chat is selected')).not.toBeInTheDocument();
    expect(screen.getByText(/Select a person to open a direct message thread/i)).toBeInTheDocument();
  });

  it('shows API and websocket chat errors when loading or parsing fails', async () => {
    vi.spyOn(movieDiaryApi, 'getChatMessages').mockRejectedValueOnce(new Error('Conversation failed to load'));

    render(<ChatPage onBack={vi.fn()} />);

    const socket = MockWebSocket.instances[0];
    expect(await screen.findByRole('alert')).toHaveTextContent('Conversation failed to load');

    await act(async () => {
      socket.emit('open', new Event('open'));
      socket.emit('message', {
        data: JSON.stringify({
          type: 'error',
          message: 'Server-side chat error',
        }),
      } as MessageEvent<string>);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Server-side chat error');

    await act(async () => {
      socket.emit('message', {
        data: '{not-valid-json',
      } as MessageEvent<string>);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not read chat message from the server.');
  });

  it('prevents sending empty or disconnected messages', async () => {
    const user = userEvent.setup();

    render(<ChatPage onBack={vi.fn()} />);

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.emit('open', new Event('open'));
    });

    const composer = await screen.findByPlaceholderText(/private message/i);
    await user.click(screen.getByRole('button', { name: /Send/i }));
    expect(socket.sentMessages).toHaveLength(0);

    socket.readyState = 0;
    await user.type(composer, 'Will not send');
    await user.click(screen.getByRole('button', { name: /Send/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Chat is not connected yet.');
    expect(socket.sentMessages).toHaveLength(0);
  });

  it('requires selecting a user before submitting a connected chat message', async () => {
    vi.spyOn(movieDiaryApi, 'getChatUsers').mockResolvedValue([]);
    const user = userEvent.setup();

    render(<ChatPage onBack={vi.fn()} />);

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.emit('open', new Event('open'));
    });

    const composer = await screen.findByPlaceholderText(/Choose a user before sending a message/i);
    await user.type(composer, 'Hello?');
    fireEvent.submit(composer.closest('form')!);

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a user to start chatting.');
    expect(socket.sentMessages).toHaveLength(0);
  });

  it('shows a delayed connection failure warning after a connected socket emits an error', async () => {
    vi.useFakeTimers();

    render(<ChatPage onBack={vi.fn()} />);

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.emit('open', new Event('open'));
      socket.emit('error', new Event('error'));
      vi.advanceTimersByTime(599);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Chat connection failed.');
  });

  it('clears a pending connection warning if the socket reconnects in time', async () => {
    vi.useFakeTimers();

    render(<ChatPage onBack={vi.fn()} />);

    const socket = MockWebSocket.instances[0];
    await act(async () => {
      socket.emit('close', new CloseEvent('close'));
      vi.advanceTimersByTime(300);
      socket.emit('open', new Event('open'));
      vi.advanceTimersByTime(600);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders incoming private messages and supports going back', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(<ChatPage onBack={onBack} />);

    const socket = MockWebSocket.instances[0];
    expect(await screen.findByPlaceholderText(/private message/i)).toBeInTheDocument();
    expect(await screen.findByText('Hello from another browser')).toBeInTheDocument();

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
